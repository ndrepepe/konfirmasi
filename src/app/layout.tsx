import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Konfirmasi Prosedur",
  description: "Aplikasi pelaporan prosedur konfirmasi cabang",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-950">{children}</body>
    </html>
  );
}
