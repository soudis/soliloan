# `src/actions` holds only client-callable safe-actions

A `'use server'` function is a public HTTP endpoint, so it is reachable from the client whether or not a client uses it. We therefore keep `'use server'` for functions the client actually calls, and nothing else:

1. Everything in `src/actions` is called by the client. Code that only server code calls (pages, layouts, other server functions) lives in `src/lib/<domain>/` as a plain function with `import 'server-only'`.
2. Every action is built with next-safe-action (`authAction`, `managerAction`, `projectAction`, …). Actions that must work before sign-in use the base `actionClient` and are public on purpose.
3. A server-only function that trusts its caller to have checked access is named `…Unsafe`. It is never a `'use server'` function, so the client cannot call it. A server-only function that checks access itself keeps its plain name.

When server code and the client need the same logic, the logic lives in `src/lib` and the action is a thin safe-action wrapper around it.
