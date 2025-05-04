export function validationError(
  message: string,
  params?: Record<string, unknown>
) {
  return JSON.stringify({
    message,
    params,
  });
}

export function parseValidationError(str?: string) {
  if (!str) {
    return undefined;
  }

  try {
    return JSON.parse(str);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return undefined;
  }
}
