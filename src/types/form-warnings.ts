export type FormWarningMessageNamespace = 'dashboard.loans.sanityChecks' | 'dashboard.lenders.sanityChecks';

export type FormWarningMessageValues = Record<string, string | number>;

export type FormWarning = {
  id: string;
  message?: string;
  messageKey?: string;
  messageNamespace?: FormWarningMessageNamespace;
  messageValues?: FormWarningMessageValues;
};

export function areFormWarningsEqual(a: FormWarning, b: FormWarning): boolean {
  if (a.id !== b.id) return false;

  if (a.message !== undefined || b.message !== undefined) {
    return a.message === b.message;
  }

  if (a.messageKey !== b.messageKey || a.messageNamespace !== b.messageNamespace) {
    return false;
  }

  const aValues = a.messageValues ?? {};
  const bValues = b.messageValues ?? {};
  const keys = Object.keys(aValues);

  if (keys.length !== Object.keys(bValues).length) return false;

  return keys.every((key) => aValues[key] === bValues[key]);
}
