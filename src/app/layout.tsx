import type { Metadata } from "next";
import { Fredoka, Nunito_Sans } from "next/font/google";
import "./globals.css";
import { DrawlyProviders } from "@/components/providers/DrawlyProviders";

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Drawly — draw, describe, reveal",
  description:
    "A multiplayer party game: draw prompts, describe sketches, and laugh at the chain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunitoSans.variable}`}
      style={{ backgroundColor: "#111118" }}
    >
      <body
        className="min-h-dvh font-sans antialiased"
        style={{
          backgroundColor: "#111118",
          color: "#f4f4f5",
        }}
      >
        <DrawlyProviders>{children}</DrawlyProviders>
      </body>
    </html>
  );
}
