// src/components/AuthProvider.tsx
"use client"; // This component must be a Client Component

import { SessionProvider } from "next-auth/react";
import React from "react";

type Props = {
  children?: React.ReactNode;
};

export const AuthProvider = ({ children }: Props) => {
  // Just use NextAuth for authentication
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
};
