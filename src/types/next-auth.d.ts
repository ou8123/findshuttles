// Removed unused imports: NextAuth, JWT
import { DefaultSession, DefaultUser } from "next-auth";
// import { JWT } from "next-auth/jwt"; // JWT type is implicitly used by module augmentation

// Extend the default User type to include the 'role' property
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      /** The user's role. */
      role?: string; // Add role here (make optional or required as needed)
    } & DefaultSession["user"]; // Keep the default properties
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends DefaultUser {
    /** The user's role. */
    role?: string; // Add role here
  }
}

// Extend the JWT type if you are using JWT strategy and need role in the token
declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** The user's role. */
    role?: string; // Add role here
  }
}