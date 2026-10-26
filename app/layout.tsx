import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "한입퀴즈 — AI가 만들어 주는 한입 크기 퀴즈",
  description: "공부한 내용을 붙여넣으면 AI가 객관식 퀴즈를 만들고, 풀면 채점과 오답노트가 자동으로 쌓여요.",
};

export const viewport: Viewport = {
  themeColor: "#160b45",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        {/* Pretendard 웹폰트 (CDN) */}
        <link
          rel="stylesheet"
          crossOrigin="anonymous"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
