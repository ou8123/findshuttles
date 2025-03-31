"use client"; // This component needs client-side hooks

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

// Import the stealth path tokens 
const ADMIN_PATH_TOKEN = 'management-portal-8f7d3e2a1c';
const LOGIN_PATH_TOKEN = 'secure-access-9b1c3f5d7e';

interface NavItem {
  href: string;
  label: string;
}

interface AdminSidebarNavProps {
  navItems: NavItem[];
}

const AdminSidebarNav: React.FC<AdminSidebarNavProps> = ({ navItems }) => {
  const pathname = usePathname(); // Get the current path
  const { data: session } = useSession(); // Get NextAuth session
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Enhanced logout function that uses our custom handler AND NextAuth signOut
  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double-clicks
    
    setIsLoggingOut(true);
    
    try {
      console.log('Starting logout process...');
      
      // First call our custom logout API to clear all cookies
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ callbackUrl: `/${LOGIN_PATH_TOKEN}` }), // Use stealth login path
      });
      
      console.log('Custom logout API response:', response.status);
      
      // Use a short timeout to ensure cookies have time to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Then use NextAuth signOut to ensure client-side state is cleared
      await signOut({ redirect: false });
      
      console.log('NextAuth signOut completed');
      
      // Force a hard navigation to the login page
      window.location.href = `/${LOGIN_PATH_TOKEN}`; // Use stealth login path
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Fallback if our custom logout fails
      try {
        await signOut({ callbackUrl: `/${LOGIN_PATH_TOKEN}` }); // Use stealth login path
      } catch (innerError) {
        console.error('Fallback logout also failed:', innerError);
        // Last resort - hard navigation
        window.location.href = `/${LOGIN_PATH_TOKEN}`; // Use stealth login path
      }
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Convert regular admin paths to stealth admin paths for display
  const getSecureAdminPath = (path: string) => {
    return path.replace(/^\/admin\b/, `/${ADMIN_PATH_TOKEN}`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* User info and logout section */}
      <div className="mb-6 pb-4 border-b border-gray-700">
        <div className="px-3 py-2">
          <p className="text-sm text-gray-300 mb-1">Logged in as:</p>
          <p className="font-medium truncate">{session?.user?.email || 'Admin'}</p>
          
          <button 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`mt-3 text-sm text-red-400 hover:text-red-300 flex items-center ${
              isLoggingOut ? 'opacity-50 cursor-wait' : ''
            }`}
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {isLoggingOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </div>
      
      {/* Navigation links - Convert admin URLs to stealth URLs */}
      <nav className="flex-grow">
        <ul>
          {navItems.map((item) => {
            // Convert admin paths to stealth paths for display and linking
            const secureHref = item.href.startsWith('/admin') 
              ? getSecureAdminPath(item.href) 
              : item.href;
              
            const isActive = pathname === item.href || pathname === secureHref;
            
            return (
              <li key={secureHref} className="mb-2">
                <Link
                  href={secureHref}
                  className={`block py-2 px-3 rounded hover:bg-gray-700 transition-colors ${
                    isActive ? 'bg-gray-600 font-semibold' : '' // Apply active styles
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
};

export default AdminSidebarNav;
