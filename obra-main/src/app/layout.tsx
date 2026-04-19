import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ConstructionProvider } from "@/context/ConstructionContext";

const inter = Inter({ subsets: ["latin"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "ObraFlow | Gestão Inteligente de Obras",
  description: "Sistema premium de gestão de obras por andares e disciplinas. Acompanhamento em tempo real, visualização gamificada e relatórios automáticos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={`${inter.className} antialiased selection:bg-blue-500/30`}>
        <ConstructionProvider>
          {children}
        </ConstructionProvider>
      </body>
    </html>
  );
}
