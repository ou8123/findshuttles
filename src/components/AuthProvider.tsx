// src/components/AuthProvider.tsx
"use client"; // This component must be a Client Component

import { SessionProvider } from "next-auth/react";
import React from "react";
import { NetlifyAuthProvider } from "@/lib/netlify-auth-context";

type Props = {
  children?: React.ReactNode;
};

export const AuthProvider = ({ children }: Props) => {
  // Wrap both authentication providers to support a smooth transition
  // We'll use Netlify Identity for the admin section and keep NextAuth for compatibility
  return (
    <SessionProvider>
      <NetlifyAuthProvider>
        {children}
      </NetlifyAuthProvider>
    </SessionProvider>
  );
};
