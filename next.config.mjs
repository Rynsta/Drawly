/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_SOCKET_URL:
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000",
  },
};

export default nextConfig;
