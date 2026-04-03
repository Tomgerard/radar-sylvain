import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import Sidebar from "@/components/ui/Sidebar";
import "./globals.css";

const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Radar Sylvain",
  description: "Outil de gestion — Sylvain Gérard, artiste de spectacle",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${nunito.variable} h-full`}>
      <body className="h-full flex bg-background text-text antialiased">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </body>
    </html>
  );
}
