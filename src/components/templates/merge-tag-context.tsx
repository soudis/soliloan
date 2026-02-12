'use client';

import type { MergeTagConfig } from '@/actions/templates/queries/get-merge-tags';
import { createContext, useContext } from 'react';

const MergeTagConfigContext = createContext<MergeTagConfig | null>(null);

export const MergeTagConfigProvider = MergeTagConfigContext.Provider;

export const useMergeTagConfig = () => useContext(MergeTagConfigContext);
