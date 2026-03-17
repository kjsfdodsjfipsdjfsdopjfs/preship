/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  transpilePackages: ["@preship/shared"],
};

module.exports = nextConfig;
