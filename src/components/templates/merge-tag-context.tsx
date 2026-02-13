'use client';

import { createContext, useContext } from 'react';
import type { MergeTagConfig } from '@/actions/templates/queries/get-merge-tags';

const MergeTagConfigContext = createContext<MergeTagConfig | null>(null);

export const MergeTagConfigProvider = MergeTagConfigContext.Provider;

export const useMergeTagConfig = () => useContext(MergeTagConfigContext);
