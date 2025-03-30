// src/app/login/page.tsx
"use client"; // Sign-in pages often need client-side interactivity

import { signIn, getProviders } from "next-auth/react";
import { useState, useEffect } from "react";
import type { ClientSafeProvider, LiteralUnion } from "next-auth/react";
import type { BuiltInProviderType } from "next-auth/providers/index";

export default function SignInPage() {
  const [providers, setProviders] = useState<Record<LiteralUnion<BuiltInProviderType>, ClientSafeProvider> | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null); // To display potential errors

  useEffect(() => {
    const fetchProviders = async () => {
      const res = await getProviders();
      setProviders(res);
    };
    fetchProviders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        console.error("Sign-in error:", result.error);
        // Map common errors to user-friendly messages
        if (result.error === "CredentialsSignin") {
          setError("Invalid email or password. Please try again.");
        } else {
          setError("An unexpected error occurred. Please try again later.");
        }
      } else if (result?.ok) {
        // Successful sign-in
        window.location.href = '/admin';
      }
    } catch (error) {
      console.error("Sign-in error:", error);
      setError("An unexpected error occurred. Please try again later.");
    }
  };

  if (!providers) {
    return <div>Loading...</div>; // Show loading state while fetching providers
  }

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>Admin Sign In</h1>
      
      {error && (
        <p style={{ color: 'red', marginBottom: '15px', textAlign: 'center' }}>{error}</p>
      )}

      {/* Render Credentials Form */}
      {providers.credentials && (
        <form 
          id="login-form" 
          name="login-form" 
          onSubmit={handleSubmit} 
          method="post" 
          autoComplete="on"
        >
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '5px' }}>Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              autoComplete="username email"
              placeholder="admin@example.com"
            />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password" style={{ display: 'block', marginBottom: '5px' }}>Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            name="signin"
            style={{ width: '100%', padding: '10px', backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Sign In
          </button>
        </form>
      )}

      {/* Add buttons for other providers later if needed */}
      {/* {Object.values(providers).map((provider) => {
        if (provider.id === 'credentials') return null; // Don't show button for credentials
        return (
          <div key={provider.name} style={{ marginTop: '10px' }}>
            <button onClick={() => signIn(provider.id)} style={{ width: '100%', padding: '10px' }}>
              Sign in with {provider.name}
            </button>
          </div>
        );
      })} */}
    </div>
  );
}
