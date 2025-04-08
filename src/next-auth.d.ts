import { DefaultUser } from "@auth/core/types";
import { DefaultSession } from "next-auth";
import type { AdapterUser as BaseAdapterUser } from "next-auth/adapters";
import { DefaultJWT } from "@auth/core/jwt";

declare module "@auth/core/adapters" {
  interface AdapterUser extends BaseAdapterUser {
    isAdmin: boolean;
    isManager: boolean;
    managerOf: string[];
    loanedToProjects: string[];
    language: string;
  }
}


/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  export interface Session extends DefaultSession {
    user: User
  }

  export interface User extends DefaultUser {
    // ...other properties
    isAdmin: boolean;
    isManager: boolean;
    managerOf: string[];
    loanedToProjects: string[];
    language: string;
  }

  export interface JWT extends DefaultJWT {
    user: User;
  }
}