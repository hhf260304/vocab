import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["hanzi-to-zhuyin", "hanzi-tokenizer", "mdbg", "cedict"],
};

export default nextConfig;
