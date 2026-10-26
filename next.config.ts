import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 로그인 쿠키에 따라 매 요청 다르게 그리는 앱이라 cacheComponents(부분 사전 렌더링)는 사용하지 않는다.
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
