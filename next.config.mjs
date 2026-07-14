/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // libSQL クライアントはバンドルせず外部依存として扱う（ネイティブ実装を含むため、
  // サーバーレス関数へ正しく同梱させる。remoteは /web を使うので通常ネイティブは不要だが保険）。
  experimental: {
    serverComponentsExternalPackages: ["@libsql/client", "libsql"],
  },
};

export default nextConfig;
