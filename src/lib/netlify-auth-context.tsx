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

// Extended auth state to include error handling and timeout state
type AuthState = {
  user: NetlifyUser | null;
  isLoading: boolean;
  error: string | null;
  isTimedOut: boolean;
};

// Initialize Netlify Identity with options
// We do this outside of the React lifecycle to ensure it's only initialized once
if (typeof window !== 'undefined') {
  try {
    netlifyIdentity.init({
      APIUrl: process.env.NEXT_PUBLIC_NETLIFY_IDENTITY_URL,
    });
    console.log('[NetlifyAuth] Identity widget initialized');
  } catch (err) {
    console.error('[NetlifyAuth] Error initializing identity widget:', err);
  }
}

// Fallback admin check - allows hardcoded admin emails when Netlify Identity fails
const ADMIN_EMAILS = ['aiaffiliatecom@gmail.com'];

// Authentication timeout settings
const AUTH_TIMEOUT_MS = 5000; // 5 seconds timeout for auth operations

// Create auth context with extended functionality
const NetlifyAuthContext = createContext<{
  user: NetlifyUser | null;
  login: () => void;
  logout: () => void;
  signup: () => void;
  isAdmin: boolean;
  isLoading: boolean;
  isTimedOut: boolean;
  error: string | null;
  resetError: () => void;
  useDirectLogin: (email: string, password: string) => Promise<boolean>;
  handleInviteToken: (token?: string) => void;
}>({
  user: null,
  login: () => {},
  logout: () => {},
  signup: () => {},
  isAdmin: false,
  isLoading: true,
  isTimedOut: false,
  error: null,
  resetError: () => {},
  useDirectLogin: async () => false,
  handleInviteToken: () => {},
});

// Provider component
export function NetlifyAuthProvider({ children }: { children: React.ReactNode }) {
  // Expanded state to include error handling and timeout
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    error: null,
    isTimedOut: false
  });
  
  // Reset error helper
  const resetError = () => {
    setAuthState(prev => ({ ...prev, error: null }));
  };

  // Handle invitation token
  const handleInviteToken = (token?: string) => {
    // Reset any previous errors
    resetError();
    
    // If token is provided directly, use it, otherwise check the URL
    const inviteToken = token || (typeof window !== 'undefined' && 
      window.location.hash && 
      window.location.hash.match(/invite_token=([^&]+)/))?.[1];
    
    if (inviteToken) {
      console.log('[NetlifyAuth] Found invitation token, opening signup modal');
      try {
        // Open the signup modal with the token
        netlifyIdentity.open('signup');
        return true;
      } catch (error) {
        console.error('[NetlifyAuth] Error processing invitation token:', error);
        setAuthState(prev => ({ 
          ...prev, 
          error: 'Failed to process invitation token'
        }));
        return false;
      }
    }
    return false;
  };
  
  // Set up a timeout for auth operations
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    if (authState.isLoading) {
      console.log('[NetlifyAuth] Setting authentication timeout');
      timeoutId = setTimeout(() => {
        console.log('[NetlifyAuth] Authentication timed out');
        setAuthState(prev => ({ 
          ...prev, 
          isLoading: false, 
          isTimedOut: true,
          error: 'Authentication check timed out. Please try refreshing the page.'
        }));
      }, AUTH_TIMEOUT_MS);
    }
    
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [authState.isLoading]);
  
  // Main authentication effect
  useEffect(() => {
    console.log('[NetlifyAuth] Initializing authentication');
    
    // Set initial user (if already logged in)
    try {
      const currentUser = netlifyIdentity.currentUser();
      console.log('[NetlifyAuth] Current user:', currentUser?.email || 'none');
      
      setAuthState(prev => ({
        ...prev,
        user: currentUser || null,
        isLoading: false
      }));
    } catch (error) {
      console.error('[NetlifyAuth] Error getting current user:', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Failed to retrieve authentication state',
        isLoading: false
      }));
    }
    
    // Check for invitation token in URL
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('invite_token=')) {
      handleInviteToken();
    }
    
    // Subscribe to login events
    const loginHandler = (user: NetlifyUser) => {
      console.log('[NetlifyAuth] User logged in:', user.email);
      setAuthState(prev => ({ 
        ...prev, 
        user, 
        isLoading: false,
        error: null,
        isTimedOut: false
      }));
      netlifyIdentity.close();
    };
    
    // Subscribe to logout events
    const logoutHandler = () => {
      console.log('[NetlifyAuth] User logged out');
      setAuthState(prev => ({ 
        ...prev, 
        user: null, 
        isLoading: false,
        isTimedOut: false
      }));
    };
    
    // Subscribe to init events (to get user after init)
    const initHandler = () => {
      const currentUser = netlifyIdentity.currentUser();
      console.log('[NetlifyAuth] Identity initialized, user:', currentUser?.email || 'none');
      
      setAuthState(prev => ({
        ...prev,
        user: currentUser || null,
        isLoading: false
      }));
    };
    
    // Subscribe to error events
    const errorHandler = (err: Error) => {
      console.error('[NetlifyAuth] Identity error:', err);
      setAuthState(prev => ({
        ...prev,
        error: err.message,
        isLoading: false
      }));
    };
    
    // Set up event listeners
    netlifyIdentity.on('login', loginHandler);
    netlifyIdentity.on('logout', logoutHandler);
    netlifyIdentity.on('init', initHandler);
    netlifyIdentity.on('error', errorHandler);
    
    return () => {
      // Clean up listeners
      netlifyIdentity.off('login', loginHandler);
      netlifyIdentity.off('logout', logoutHandler);
      netlifyIdentity.off('init', initHandler);
      netlifyIdentity.off('error', errorHandler);
    };
  }, []);
  
  // Check if user has admin role (with fallback to hardcoded admins)
  const isAdmin = Boolean(
    // Regular check via Netlify Identity roles
    authState.user?.app_metadata?.roles?.includes('admin') ||
    // Fallback check using hardcoded admin emails
    (authState.user && ADMIN_EMAILS.includes(authState.user.email))
  );
  
  // Direct login method (alternative to Netlify Identity)
  const useDirectLogin = async (email: string, password: string): Promise<boolean> => {
    // This is a fallback method for when Netlify Identity isn't working
    try {
      // First attempt to check if this is a valid admin email
      if (!ADMIN_EMAILS.includes(email)) {
        console.error('[NetlifyAuth] Direct login failed: Not an admin email');
        return false;
      }
      
      // Create a direct login request to our custom endpoint
      const response = await fetch('/api/admin/bypass-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        throw new Error('Authentication failed');
      }
      
      const data = await response.json();
      
      // Set user based on direct login response
      setAuthState(prev => ({
        ...prev,
        user: {
          id: data.userId,
          email: email,
          app_metadata: { roles: ['admin'] },
          user_metadata: {}
        },
        isLoading: false,
        error: null,
        isTimedOut: false
      }));
      
      return true;
    } catch (error) {
      console.error('[NetlifyAuth] Direct login error:', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Direct login failed',
        isLoading: false
      }));
      return false;
    }
  };
  
  // Standard Netlify Identity methods
  const login = () => {
    resetError();
    try {
      netlifyIdentity.open('login');
    } catch (error) {
      console.error('[NetlifyAuth] Error opening login modal:', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Failed to open login modal',
        isLoading: false
      }));
    }
  };
  
  const signup = () => {
    resetError();
    try {
      netlifyIdentity.open('signup');
    } catch (error) {
      console.error('[NetlifyAuth] Error opening signup modal:', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Failed to open signup modal',
        isLoading: false
      }));
    }
  };
  
  const logout = () => {
    resetError();
    try {
      netlifyIdentity.logout();
    } catch (error) {
      console.error('[NetlifyAuth] Error during logout:', error);
      setAuthState(prev => ({
        ...prev,
        error: 'Failed to logout',
        isLoading: false
      }));
    }
  };
  
  return (
    <NetlifyAuthContext.Provider value={{ 
      user: authState.user, 
      login, 
      logout, 
      signup,
      isAdmin, 
      isLoading: authState.isLoading,
      isTimedOut: authState.isTimedOut,
      error: authState.error,
      resetError,
      useDirectLogin,
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
