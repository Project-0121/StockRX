import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { APP_NAME, APP_TAGLINE, APP_SUBTITLE } from "@/lib/constants";
import { Providers } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} - ${APP_SUBTITLE}`,
    template: `%s | ${APP_NAME}`,
  },
  description: `${APP_NAME}: ${APP_TAGLINE}. Centralized pharmacy inventory management system with automated FEFO dispensing, audit trails, and real-time alerts.`,
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
