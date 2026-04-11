import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/lib/toast";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";

export const metadata: Metadata = {
  title: "Holiday Planner",
  description: "AI-powered holiday planning for groups",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Holiday Planner",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const messages = await getMessages();

  return (
    <html lang="en">
      <body>
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>{children}</ToastProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}