'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import netlifyIdentity from 'netlify-identity-widget';

// Define user type based on Netlify Identity Widget
type NetlifyUser = {
  id: string;
  email: string;
  app_metadata?: {
    roles?: string[];
    [key: string]: any;
  };
  user_metadata?: {
    [key: string]: any;
  };
  [key: string]: any;
};

// Initialize Netlify Identity with options
// We do this outside of the React lifecycle to ensure it's only initialized once
if (typeof window !== 'undefined') {
  netlifyIdentity.init({
    APIUrl: process.env.NEXT_PUBLIC_NETLIFY_IDENTITY_URL,
  });
}

// Create auth context
const NetlifyAuthContext = createContext<{
  user: NetlifyUser | null;
  login: () => void;
  logout: () => void;
  signup: () => void;
  isAdmin: boolean;
  isLoading: boolean;
  handleInviteToken: (token?: string) => void;
}>({
  user: null,
  login: () => {},
  logout: () => {},
  signup: () => {},
  isAdmin: false,
  isLoading: true,
  handleInviteToken: () => {},
});

// Provider component
export function NetlifyAuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<NetlifyUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Handle invitation token
  const handleInviteToken = (token?: string) => {
    // If token is provided directly, use it, otherwise check the URL
    const inviteToken = token || (typeof window !== 'undefined' && 
      window.location.hash && 
      window.location.hash.match(/invite_token=([^&]+)/))?.[1];
    
    if (inviteToken) {
      console.log('Found invitation token, opening signup modal');
      try {
        // Open the signup modal with the token
        netlifyIdentity.open('signup');
      } catch (error) {
        console.error('Error processing invitation token:', error);
      }
    }
  };
  
  useEffect(() => {
    // Set initial user (if already logged in)
    try {
      const currentUser = netlifyIdentity.currentUser();
      setUser(currentUser || null);
    } catch (error) {
      console.error('Error getting current user:', error);
    } finally {
      setIsLoading(false);
    }
    
    // Check for invitation token in URL
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('invite_token=')) {
      handleInviteToken();
    }
    
    // Subscribe to login events
    const loginHandler = (user: NetlifyUser) => {
      console.log('User logged in:', user.email);
      setUser(user);
      netlifyIdentity.close();
    };
    
    // Subscribe to logout events
    const logoutHandler = () => {
      console.log('User logged out');
      setUser(null);
    };
    
    // Subscribe to init events (to get user after init)
    const initHandler = () => {
      const currentUser = netlifyIdentity.currentUser();
      setUser(currentUser || null);
      setIsLoading(false);
    };
    
    // Set up event listeners
    netlifyIdentity.on('login', loginHandler);
    netlifyIdentity.on('logout', logoutHandler);
    netlifyIdentity.on('init', initHandler);
    
    return () => {
      // Clean up listeners
      netlifyIdentity.off('login', loginHandler);
      netlifyIdentity.off('logout', logoutHandler);
      netlifyIdentity.off('init', initHandler);
    };
  }, []);
  
  // Check if user has admin role
  const isAdmin = Boolean(user?.app_metadata?.roles?.includes('admin'));
  
  // Login method
  const login = () => {
    netlifyIdentity.open('login');
  };
  
  // Signup method
  const signup = () => {
    netlifyIdentity.open('signup');
  };
  
  // Logout method
  const logout = () => {
    netlifyIdentity.logout();
  };
  
  return (
    <NetlifyAuthContext.Provider value={{ 
      user, 
      login, 
      logout, 
      signup,
      isAdmin, 
      isLoading,
      handleInviteToken
    }}>
      {children}
    </NetlifyAuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useNetlifyAuth() {
  return useContext(NetlifyAuthContext);
}
