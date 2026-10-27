import type { NextConfig } from "next";

// The self-hosted pipeline runs typecheck and lint as independent gates.
// Avoid repeating memory-heavy validation inside the Next.js build worker on
// the 1 GB VM. Production builds do not set this flag and remain unchanged.
const separateValidation = process.env.GREENAFRICA_LOCAL_CI_SEPARATE_CHECKS === "true";

const nextConfig: NextConfig = {
  ...(separateValidation ? {
    eslint: { ignoreDuringBuilds: true },
    typescript: { ignoreBuildErrors: true },
  } : {}),
};

export default nextConfig;
