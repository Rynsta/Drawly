import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { DrawlyProviders } from "@/components/providers/DrawlyProviders";

/** 0xProto Nerd Font Propo — proportional build for UI (Nerd Fonts / SIL OFL). */
const protoNerd = localFont({
  src: [
    {
      path: "../fonts/0xproto/0xProtoNerdFontPropo-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../fonts/0xproto/0xProtoNerdFontPropo-Italic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../fonts/0xproto/0xProtoNerdFontPropo-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-proto-nerd",
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
      className={protoNerd.variable}
      style={{ backgroundColor: "#0f0f1a" }}
    >
      <body
        className="min-h-dvh font-sans antialiased"
        style={{
          backgroundColor: "#0f0f1a",
          color: "#f4f4f5",
        }}
      >
        <DrawlyProviders>{children}</DrawlyProviders>
      </body>
    </html>
  );
}
