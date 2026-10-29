'use client';

import { createContext, useContext } from 'react';
import type { MergeTagConfig } from '@/lib/templates/merge-tag-config';

const MergeTagConfigContext = createContext<MergeTagConfig | null>(null);

export const MergeTagConfigProvider = MergeTagConfigContext.Provider;

export const useMergeTagConfig = () => useContext(MergeTagConfigContext);
