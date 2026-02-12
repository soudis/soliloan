'use client';

import { createContext, useContext } from 'react';

interface LogoContextValue {
  /** Base64 project logo, or null if none configured */
  projectLogo: string | null;
  /** Fallback app logo path */
  appLogo: string;
}

const LogoContext = createContext<LogoContextValue>({
  projectLogo: null,
  appLogo: '/soliloan-logo.webp',
});

export const LogoProvider = LogoContext.Provider;

export const useLogo = () => useContext(LogoContext);
