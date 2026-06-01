'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { FormWarning } from '@/types/form-warnings';

type FormSanityChecksContextValue = {
  warnings: FormWarning[];
  setWarning: (id: string, warning: FormWarning | null) => void;
  clearWarning: (id: string) => void;
};

const FormSanityChecksContext = createContext<FormSanityChecksContextValue | null>(null);

export function FormSanityChecksProvider({ children }: { children: ReactNode }) {
  const [warningsById, setWarningsById] = useState<Record<string, FormWarning>>({});

  const setWarning = useCallback((id: string, warning: FormWarning | null) => {
    setWarningsById((prev) => {
      if (!warning) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      const existing = prev[id];
      if (existing?.id === warning.id && existing.message === warning.message) {
        return prev;
      }
      return { ...prev, [id]: warning };
    });
  }, []);

  const clearWarning = useCallback((id: string) => setWarning(id, null), [setWarning]);

  const warnings = useMemo(() => Object.values(warningsById), [warningsById]);

  const value = useMemo(
    () => ({ warnings, setWarning, clearWarning }),
    [warnings, setWarning, clearWarning],
  );

  return <FormSanityChecksContext.Provider value={value}>{children}</FormSanityChecksContext.Provider>;
}

export function useFormSanityChecks() {
  const context = useContext(FormSanityChecksContext);
  if (!context) {
    throw new Error('useFormSanityChecks must be used within FormSanityChecksProvider');
  }
  return context;
}

export function useFormSanityChecksOptional() {
  return useContext(FormSanityChecksContext);
}

/** Registriert eine Warnung per id; beim Unmount oder bei `null` wird sie entfernt. */
export function useFormSanityCheckWarning(id: string, warning: FormWarning | null) {
  const { setWarning } = useFormSanityChecks();

  useEffect(() => {
    setWarning(id, warning);
    return () => setWarning(id, null);
  }, [id, warning, setWarning]);
}
