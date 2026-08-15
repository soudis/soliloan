'use client';

import { createContext, useContext } from 'react';

import type { FilterPresenceApi } from '@/lib/table-filter-presence';

const FilterPresenceContext = createContext<FilterPresenceApi | null>(null);

export function FilterPresenceProvider({
  value,
  children,
}: {
  value: FilterPresenceApi | null;
  children: React.ReactNode;
}) {
  return <FilterPresenceContext.Provider value={value}>{children}</FilterPresenceContext.Provider>;
}

export function useFilterPresence(): FilterPresenceApi | null {
  return useContext(FilterPresenceContext);
}
