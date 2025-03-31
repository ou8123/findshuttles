"use client"; // This component needs client-side hooks

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import React from 'react';
import { useSession, signOut } from 'next-auth/react';

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

  // Enhanced logout function that uses our custom handler AND NextAuth signOut
  const handleLogout = async () => {
    try {
      // First call our custom logout API to clear all cookies
      const resp = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ redirectUrl: '/login' }),
      });
      
      // Then use NextAuth signOut (without redirect since our API will handle it)
      // This ensures NextAuth state is also cleared
      await signOut({ redirect: false });
      
      // Manual redirect for cases where the API redirect might not work
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback to default NextAuth signOut if our custom API fails
      signOut({ callbackUrl: '/login' });
    }
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
            className="mt-3 text-sm text-red-400 hover:text-red-300 flex items-center"
          >
            <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </div>
      
      {/* Navigation links */}
      <nav className="flex-grow">
        <ul>
          {navItems.map((item) => {
            const isActive = pathname === item.href; // Check if the link is active
            return (
              <li key={item.href} className="mb-2">
                <Link
                  href={item.href}
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
