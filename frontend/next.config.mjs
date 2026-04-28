/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  webpack: (
    config,
    { buildId, dev, isServer, defaultLoaders, nextRuntime, webpack },
  ) => {
    // Workaround for webpack doesn't support import.meta.dirname
    config.plugins.push(
      new webpack.DefinePlugin({
        "import.meta.dirname": "__dirname",
      }),
    );
    return config;
  }
};

export default nextConfig;
