import React from 'react';

interface Auth0LoginButtonProps {
  className?: string;
  redirectTo?: string;
}

export default function Auth0LoginButton({ 
  className = '', 
  redirectTo = '/admin'
}: Auth0LoginButtonProps) {
  // Build the auth0 login URL with redirect
  const loginUrl = `/api/auth/login?returnTo=${encodeURIComponent(redirectTo)}`;
  
  return (
    <a
      href={loginUrl}
      className={`flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${className}`}
    >
      Sign in with Auth0
    </a>
  );
}
