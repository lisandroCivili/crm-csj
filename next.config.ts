import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Los padrones reales pesan cerca de 2 MB y el limite por defecto es 1 MB.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
