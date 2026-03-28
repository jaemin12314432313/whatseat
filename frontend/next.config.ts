import path from "node:path";
import type { NextConfig } from "next";

/**
 * 루트에 npm workspaces + package-lock이 있으면 Turbopack이 저장소 루트를
 * 앱 루트로 오인해 `tailwindcss` 등을 `../node_modules`에서만 찾다 실패함.
 * 실제 Next 앱 디렉터리(이 파일이 있는 곳)를 명시한다.
 */
const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
