import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['bcrypt', '@react-pdf/renderer', 'react-pdf-html'],
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
