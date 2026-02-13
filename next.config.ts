import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  reactCompiler: false,
  serverExternalPackages: ['bcrypt', '@react-pdf/renderer', 'react-pdf-html'],
  experimental: {
    inlineCss: true,
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
