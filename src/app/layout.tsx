import type { Metadata } from "next";
import "./globals.css";
import ClientProviders from "./client-providers";

export const metadata: Metadata = {
  title: "نظام المحاسبة - كروت الإنترنت",
  description: "نظام محاسبة متكامل لإدارة نشاط بيع كروت الإنترنت",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl">
      <body className="bg-gray-50 min-h-screen">
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
