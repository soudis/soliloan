
export function validationError(message: string, params?: Record<string, any>) {
  return JSON.stringify({
    message,
    params,
  })
}

export function parseValidationError(str?: string) {
  if (!str) {
    return undefined;
  }

  try {
    return JSON.parse(str)
  } catch (e) {
    return undefined;
  }
}
