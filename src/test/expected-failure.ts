import { it } from 'node:test';

/**
 * Registers a specification the code does not meet yet. The body asserts the correct value,
 * so the test passes while the body throws and fails once the code meets the specification.
 * The failure message says to remove the wrapper and keep the assertion.
 */
export function expectedFailure(name: string, body: () => void | Promise<void>): void {
  it(name, async () => {
    try {
      await body();
    } catch {
      return;
    }
    throw new Error('the specification is met now, remove the expectedFailure wrapper and keep the assertion');
  });
}
