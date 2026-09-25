import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Desify — paste it, get it in five Indian languages",
  description:
    "Paste any LinkedIn or Twitter/X post and instantly translate it into Hindi, Bengali, Tamil, Telugu, and Marathi — with AI voiceover. Powered by Sarvam AI. No sign-up needed.",
  keywords: ["Indian languages", "translate", "LinkedIn", "Twitter", "Hindi", "Sarvam AI", "desify"],
  openGraph: {
    title: "Desify — paste it, get it in five Indian languages",
    description:
      "Translate your social media post into 5 Indian languages with AI voice. Free & instant.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>{children}</body>
    </html>
  );
}
