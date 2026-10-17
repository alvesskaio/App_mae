/** @type {import('next').NextConfig} */
const nextConfig = {
  // Site 100% estático: os dados ficam no aparelho, não há servidor.
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  reactStrictMode: true,
};

export default nextConfig;
