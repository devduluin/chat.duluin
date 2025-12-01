/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  compiler: {
    reactRemoveProperties: process.env.NODE_ENV === 'production',
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "gajian.duluin.com",
        pathname: "/assets/img/**", // allow all images in this path
      },
      {
        protocol: "https",
        hostname: "duluin.com",
        pathname: "/storage/photos/**", // allow all images in this path
      },
    ],
  },
  env: {
    API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
};

module.exports = nextConfig;
