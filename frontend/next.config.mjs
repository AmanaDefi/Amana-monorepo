/** @type {import('next').NextConfig} */
const nextConfig = {
  // fixes wallet connect dependency issue https://docs.walletconnect.com/web3modal/nextjs/about#extra-configuration
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    });
    // Enable WebAssembly support for tiny-secp256k1/bitcoinjs-lib
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    return config;
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'assets.example.com',
        port: '',
        pathname: '/account123/**'
      },
    ],
  },

};

export default nextConfig;
