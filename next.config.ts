import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';
import TerserPlugin from 'terser-webpack-plugin';

const JS_MINIFIER_NAMES = new Set(['TerserPlugin', 'MinifyPlugin', 'SwcJsMinimizerPlugin']);

function isJsMinifier(plugin: unknown): boolean {
  if (!plugin || typeof plugin !== 'object') return false;
  const name = (plugin as { constructor?: { name?: string } }).constructor?.name;
  return typeof name === 'string' && JS_MINIFIER_NAMES.has(name);
}

const nextConfig: NextConfig = {
  reactCompiler: false,
  serverExternalPackages: ['@react-pdf/renderer', 'react-pdf-html'],
  experimental: {
    inlineCss: true,
  },
  webpack: (config, { dev }) => {
    if (dev) return config;

    const minimizers = config.optimization?.minimizer ?? [];
    config.optimization = {
      ...config.optimization,
      minimize: true,
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: true,
            mangle: true,
          },
        }),
        ...minimizers.filter((plugin: unknown) => !isJsMinifier(plugin)),
      ],
    };

    return config;
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
