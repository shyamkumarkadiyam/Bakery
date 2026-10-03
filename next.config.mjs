import { imageHosts } from './image-hosts.config.mjs';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js';

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: true,
  distDir: process.env.DIST_DIR || '.next',

  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 31536000,
    qualities: [75, 85, 100],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  }
};
// A build must never overwrite the running preview's chunks/manifests.
export default (phase) => ({ ...nextConfig, distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : nextConfig.distDir });