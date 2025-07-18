/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [],
  
  webpack: (config, { isServer }) => {
    // Add alias for the local SDK
    config.resolve.alias['@aori/aori-ts'] = require('path').resolve(__dirname, '../../src/index.ts');
    
    // Handle TypeScript files from the parent directory
    config.module.rules.push({
      test: /\.tsx?$/,
      include: [require('path').resolve(__dirname, '../../src')],
      use: {
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
    });

    return config;
  },
}

module.exports = nextConfig 