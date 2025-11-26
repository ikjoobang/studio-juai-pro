import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import "./globals.css";

export const metadata: Metadata = {
  title: "Super Agent Platform | Studio Juai",
  description: "AI 네비게이터, 워크스페이스, B2B API 허브가 결합된 올인원 플랫폼",
  keywords: ["AI", "영상 제작", "마케팅", "자동화", "Studio Juai"],
  authors: [{ name: "Studio Juai" }],
  openGraph: {
    title: "Super Agent Platform",
    description: "AI 기반 콘텐츠 제작 플랫폼",
    type: "website",
    locale: "ko_KR",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link
          rel="preconnect"
          href="https://cdn.jsdelivr.net"
          crossOrigin="anonymous"
        />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* Main Content */}
        <main className="relative flex min-h-screen flex-col">
          {children}
        </main>
        
        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#111111",
              color: "#ffffff",
              borderRadius: "12px",
              padding: "16px",
            },
            success: {
              iconTheme: {
                primary: "#03C75A",
                secondary: "#ffffff",
              },
            },
            error: {
              iconTheme: {
                primary: "#EF4444",
                secondary: "#ffffff",
              },
            },
          }}
        />
      </body>
    </html>
  );
}
