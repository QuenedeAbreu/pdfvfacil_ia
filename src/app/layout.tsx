import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PDV Fácil",
  description: "Sistema de Frente de Caixa e Gestão",
};

import Providers from "@/components/Providers";
import GlobalDialog from "@/components/GlobalDialog";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 selection:bg-brand-500 selection:text-white">
        <Providers>
          {children}
          <GlobalDialog />
        </Providers>
      </body>
    </html>
  );
}
