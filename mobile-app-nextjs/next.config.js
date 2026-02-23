/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});


const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'wxvhkljrbcpcgpgdqhsp.supabase.co',
      },
    ],
  },
  turbopack: {
    root: __dirname,
  },
};

module.exports = withPWA(nextConfig);