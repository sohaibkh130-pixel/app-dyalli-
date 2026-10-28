import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "LifeOS AI — Votre progression, en toute clarté", template: "%s · LifeOS AI" },
  description: "Organisez vos journées, suivez vos finances, développez vos compétences et transformez vos objectifs en résultats mesurables.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
