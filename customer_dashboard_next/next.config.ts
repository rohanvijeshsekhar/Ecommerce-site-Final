import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Django media server images
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "8000",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "api.faazo.com",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "faazo.cloud",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "www.faazo.cloud",
        pathname: "/media/**",
      },
      {
        protocol: "https",
        hostname: "api.faazo.cloud",
        pathname: "/media/**",
      },
      {
        protocol: "http",
        hostname: "faazo.cloud",
        pathname: "/media/**",
      },
    ],
  },

  // Standalone output for Docker deployment
  output: "standalone",

  // Move dev indicator to bottom-right away from the sidebar
  devIndicators: {
    position: "bottom-right",
  },

  // Redirect legacy /blog routes cleanly to homepage
  async redirects() {
    return [
      {
        source: '/blog',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blog/:path*',
        destination: '/',
        permanent: true,
      },
    ];
  },

  // Proxy media uploads directly to backend Django server
  async rewrites() {
    return [
      {
        source: '/media/:path*',
        destination: 'http://127.0.0.1:8000/media/:path*',
      },
    ];
  },
};

export default nextConfig;
