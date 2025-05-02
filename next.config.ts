import { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const nextConfig: NextConfig = {
  serverExternalPackages: ['bcrypt'],
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);