const isProd = process.env.NODE_ENV === 'production';

const nextConfig = {
  transpilePackages: ["@geiger/ui"],
  basePath: isProd ? '/chat' : '',
  allowedDevOrigins: ['127.0.0.1'],
  env: {
    NEXT_PUBLIC_BASE_PATH: isProd ? '/chat' : '',
  },
};

export default nextConfig;
