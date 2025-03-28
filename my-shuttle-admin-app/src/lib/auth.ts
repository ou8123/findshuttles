// src/lib/auth.ts
import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import prisma from "@/lib/prisma"; // Import shared Prisma client
import bcrypt from "bcrypt";
// Later: import { PrismaAdapter } from "@auth/prisma-adapter";

export const authOptions: AuthOptions = {
  // Later: adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "admin@example.com" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        console.log("Authorize function called with credentials:", credentials?.email); // Log entry point

        if (!credentials?.email || !credentials?.password) {
          console.error("Auth Error: Missing email or password");
          return null;
        }

        try {
          console.log(`Attempting to find user: ${credentials.email}`); // Log before DB call
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          console.log(`Prisma findUnique result for ${credentials.email}:`, user ? `User found (ID: ${user.id})` : "User not found"); // Log after DB call

          if (!user) {
            console.log(`Auth Attempt Failed: No user found for email ${credentials.email}`);
            return null; // User not found
          }

          // Check if user has a hashed password (they might have signed up via OAuth later)
          if (!user.hashedPassword) {
             console.log(`Auth Attempt Failed: User ${credentials.email} has no password set (maybe OAuth user?).`);
             return null;
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.hashedPassword
          );

          if (!isPasswordValid) {
            console.log(`Auth Attempt Failed: Invalid password for user ${credentials.email}`);
            return null; // Password invalid
          }

          console.log(`Auth Success: User ${credentials.email} authenticated.`);
          // Return the user object required by NextAuth (must include at least id)
          // Include other fields needed for the session/token, like role
          return {
            id: user.id,
            email: user.email,
            role: user.role,
            // Add name or other fields if they exist on your User model and you need them
          };

        } catch (error) {
          console.error("Authorize Error:", error);
          return null; // Return null on any error during authorization
        }
      }
    })
    // Add other providers like Google, GitHub later if needed
  ],
  session: {
    strategy: "jwt", // Use JWT for sessions when not using a database adapter initially or with Credentials
  },
  // Define pages if you want custom login pages, otherwise uses default
  // pages: {
  //   signIn: '/auth/signin',
  // }
  callbacks: {
    async jwt({ token, user }) {
      // When the user signs in (user object exists), add the role to the token
      if (user) {
        token.role = user.role; // Assuming 'role' exists on the user object from authorize
      }
      return token;
    },
    async session({ session, token }) {
      // Add the role from the token to the session object
      if (session?.user && token?.role) {
        session.user.role = token.role as string; // Cast role to string
      }
      return session;
    },
  },
};