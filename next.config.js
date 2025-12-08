/** @type {import('next').NextConfig} */
const nextConfig = {
  // Docker 部署需要 standalone 模式
  output: 'standalone',
};

module.exports = nextConfig;
