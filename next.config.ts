/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config: import('webpack').Configuration) => {
    // Ignore Cloudflare Workers specific files
    if (config.module) {
      config.module.noParse = [
      ...(Array.isArray(config.module.noParse) ? config.module.noParse : []),
      ];
    }
   
    
    return config;
  },
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig
