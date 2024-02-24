/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // See https://webpack.js.org/configuration/resolve/#resolvealias
    config.resolve.alias = {
      ...config.resolve.alias,
      sharp$: false,
      "onnxruntime-node$": false,
    };
    return config;
  },
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["./cache/**/*"],
    },
  },
  module: {
    rules: [
      {
        test: /\.svg$/,
        use: ['@svgr/webpack', 'url-loader'],
      },
    ],
  },
};

module.exports = nextConfig;
