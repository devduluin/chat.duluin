/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compiler: {
    reactRemoveProperties: process.env.NODE_ENV === "production",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gajian.duluin.com",
        pathname: "/assets/img/**",
      },
      {
        protocol: "https",
        hostname: "duluin.com",
        pathname: "/storage/photos/**",
      },
    ],
  },
  env: {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
  output: "standalone",
};

module.exports = nextConfig;
