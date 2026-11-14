/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ffmpeg-static', 'ffprobe-static', 'fluent-ffmpeg'],
  },
  webpack: (config) => {
    config.externals = [...config.externals, 'ffmpeg-static', 'ffprobe-static'];
    return config;
  },
};

export default nextConfig;
