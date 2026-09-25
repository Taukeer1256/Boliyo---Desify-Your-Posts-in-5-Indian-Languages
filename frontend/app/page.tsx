"use client";

import { useState, useRef, useCallback, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface TranslationResult {
  language: string;
  language_code: string;
  translated_text: string;
  flag: string;
}

interface DesifyResponse {
  translations: TranslationResult[];
  hindi_audio_base64: string | null;
  posts_desified: number;
}

// Per-language card config — mirrors mockup CSS vars and native font classes
const LANG_CONFIG: Record<
  string,
  { dye: string; nativeLabel: string; nativeClass: string; txtClass: string }
> = {
  Hindi:   { dye: "var(--hindi)",   nativeLabel: "हिंदी",   nativeClass: "native deva", txtClass: "txt deva" },
  Tamil:   { dye: "var(--tamil)",   nativeLabel: "தமிழ்",  nativeClass: "native tam",  txtClass: "txt tam"  },
  Bengali: { dye: "var(--bengali)", nativeLabel: "বাংলা",   nativeClass: "native ben",  txtClass: "txt ben"  },
  Telugu:  { dye: "var(--telugu)",  nativeLabel: "తెలుగు", nativeClass: "native tel",  txtClass: "txt tel"  },
  Marathi: { dye: "var(--marathi)", nativeLabel: "मराठी",  nativeClass: "native deva", txtClass: "txt deva" },
};

/* ─── Animated waveform play button ─── */
function WavePlayer({ audioBase64 }: { audioBase64: string }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = new Audio(`data:audio/wav;base64,${audioBase64}`);
    audioRef.current = a;
    a.onended = () => setPlaying(false);
    return () => { a.pause(); };
  }, [audioBase64]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) {
      a.pause();
      a.currentTime = 0;
      setPlaying(false);
    } else {
      a.play();
      setPlaying(true);
    }
  };

  return (
    <div className="audio">
      <button
        className="play"
        onClick={toggle}
        aria-label={playing ? "Pause Hindi audio" : "Play Hindi audio"}
        id="hindi-play-btn"
      >
        {playing ? "❚❚" : "▶"}
      </button>
      <div className={`wave${playing ? " playing" : ""}`} aria-hidden="true">
        {Array.from({ length: 16 }).map((_, i) => <i key={i} />)}
      </div>
    </div>
  );
}

/* ─── Single language card ─── */
function LangCard({
  result,
  audioBase64,
  onShare,
}: {
  result: TranslationResult;
  audioBase64?: string | null;
  onShare: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const cfg = LANG_CONFIG[result.language] ?? {
    dye: "var(--violet)",
    nativeLabel: result.language,
    nativeClass: "native",
    txtClass: "txt",
  };

  const toolUrl =
    typeof window !== "undefined" ? window.location.origin : "https://boliyo.vercel.app";

  const tweetText = encodeURIComponent(
    `My post in ${result.language}:\n\n"${result.translated_text.slice(0, 180)}${result.translated_text.length > 180 ? "…" : ""}"\n\nTranslated by Desify 🇮🇳 ${toolUrl}`
  );
  const liSummary = encodeURIComponent(
    `${result.translated_text.slice(0, 240)}${result.translated_text.length > 240 ? "…" : ""}\n\n[Translated to ${result.language} using Desify — ${toolUrl}]`
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.translated_text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch { /* silent */ }
  };

  return (
    <div
      className="card"
      style={{ "--dye": cfg.dye } as React.CSSProperties}
      id={`card-${result.language.toLowerCase()}`}
    >
      <div className={cfg.nativeClass}>{cfg.nativeLabel}</div>
      <div className="caption">{result.language}</div>
      <div className={cfg.txtClass}>{result.translated_text}</div>

      {/* Hindi gets the waveform audio player */}
      {result.language === "Hindi" && audioBase64 && (
        <WavePlayer audioBase64={audioBase64} />
      )}

      <div className="actions">
        <button
          className="copy"
          onClick={handleCopy}
          id={`copy-${result.language.toLowerCase()}`}
        >
          {copied ? "Copied" : "Copy text"}
        </button>
        <span style={{ color: "var(--line)", fontSize: "0.7rem" }}>·</span>
        <a
          href={`https://twitter.com/intent/tweet?text=${tweetText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="share-x"
          onClick={onShare}
          id={`share-x-${result.language.toLowerCase()}`}
        >
          𝕏 Share
        </a>
        <span style={{ color: "var(--line)", fontSize: "0.7rem" }}>·</span>
        <a
          href={`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(toolUrl)}&summary=${liSummary}`}
          target="_blank"
          rel="noopener noreferrer"
          className="share-li"
          onClick={onShare}
          id={`share-li-${result.language.toLowerCase()}`}
        >
          in LinkedIn
        </a>
      </div>
    </div>
  );
}

/* ─── Main page ─── */
export default function Home() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DesifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [counter, setCounter] = useState<number | null>(null);

  // Load counter on mount
  useEffect(() => {
    fetch(`${API_BASE}/stats`)
      .then((r) => r.json())
      .then((d) => setCounter(d.posts_desified))
      .catch(() => { /* silent — counter just won't show */ });
  }, []);

  const handleDesify = useCallback(async () => {
    if (!text.trim() || loading) return;
    if (text.length > 500) { setError("Max 500 characters please!"); return; }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch(`${API_BASE}/desify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), source_language_code: "en-IN" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      const data: DesifyResponse = await res.json();
      setResults(data);
      setCounter(data.posts_desified);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong — is the backend running?");
    } finally {
      setLoading(false);
    }
  }, [text, loading]);

  const handleShare = useCallback(async () => {
    try { await fetch(`${API_BASE}/share-click`, { method: "POST" }); }
    catch { /* silent */ }
  }, []);

  const handleKey = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleDesify();
  };

  return (
    <div className="wrap">
      {/* ── Header ── */}
      <header>
        <div className="mark">
          <span className="glyph">अ</span>
          <span className="word">desify</span>
        </div>
        <div className="badge">Built with Sarvam AI</div>
      </header>

      {/* ── Hero ── */}
      <div className="hero">
        {/* Rotating SVG orb */}
        <div className="orb-wrap" aria-hidden="true">
          <div className="orb-glow" />
          <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%"   stopColor="#5b6ee8" />
                <stop offset="45%"  stopColor="#9b5de5" />
                <stop offset="80%"  stopColor="#ff8a65" />
                <stop offset="100%" stopColor="#5b6ee8" />
              </linearGradient>
              <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" />
              </filter>
            </defs>
            <g className="ring-rotate">
              <circle
                cx="200" cy="200" r="128"
                fill="none" stroke="url(#ringGrad)" strokeWidth="16"
                strokeLinecap="round" filter="url(#soft)" opacity="0.92"
                transform="rotate(-20 200 200)" strokeDasharray="620 220"
              />
              <circle
                cx="200" cy="200" r="118"
                fill="none" stroke="url(#ringGrad)" strokeWidth="6"
                strokeLinecap="round" opacity="0.55"
                transform="rotate(35 200 200)" strokeDasharray="500 240"
              />
            </g>
          </svg>
        </div>

        <h1>
          Paste a post. Read it in{" "}
          <em>five Indian languages</em>. Hear it in one.
        </h1>
        <p>
          Drop in any tweet or LinkedIn post — Sarvam AI translates it and
          voices the Hindi version back to you, no sign-up needed.
        </p>

        {/* ── Input card ── */}
        <div className="inputcard">
          <textarea
            id="post-input"
            placeholder="Paste your post here…"
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null); }}
            onKeyDown={handleKey}
            maxLength={600}
            aria-label="Social media post to translate"
          />
          <div className="row">
            <button
              id="desify-btn"
              className="cta"
              onClick={handleDesify}
              disabled={loading || !text.trim() || text.length > 500}
              aria-label="Translate post into 5 Indian languages"
            >
              {loading ? (
                <><span className="spinner-sm" /> Desifying…</>
              ) : (
                "Desify it"
              )}
            </button>
            <div className="counter">
              {counter !== null ? (
                <><b>{counter.toLocaleString()}</b> posts desified so far</>
              ) : (
                <span style={{ opacity: 0.4 }}>Loading…</span>
              )}
            </div>
          </div>

          {error && (
            <div className="error-msg" role="alert">⚠️ {error}</div>
          )}
        </div>
      </div>

      {/* ── Results ── */}
      {results && (
        <section className="results" aria-label="Translation results">
          <p>Here&apos;s how your post landed:</p>
          <div className="grid">
            {results.translations.map((t) => (
              <LangCard
                key={t.language_code}
                result={t}
                audioBase64={t.language === "Hindi" ? results.hindi_audio_base64 : null}
                onShare={handleShare}
              />
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ── */}
      <footer>
        Translation &amp; speech powered by{" "}
        <a href="https://sarvam.ai" target="_blank" rel="noopener noreferrer">
          Sarvam AI
        </a>
        .
      </footer>
    </div>
  );
}
