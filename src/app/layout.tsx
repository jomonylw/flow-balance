import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/contexts/ToastContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { UserDataProvider } from "@/contexts/UserDataContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ThemeScript from "@/components/ThemeScript";
import LanguageScript from "@/components/LanguageScript";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Flow Balance - 个人财务管理",
  description: "专业的个人财务管理应用，支持多币种、智能分类和实时统计",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <ThemeScript />
        <LanguageScript />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <ToastProvider>
              <UserDataProvider>
                {children}
              </UserDataProvider>
            </ToastProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
