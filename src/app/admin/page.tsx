'use client';

import { useSession } from 'next-auth/react';
import { useNetlifyAuth } from '@/lib/netlify-auth-context';
import AdminAuthWrapper from '@/components/admin/AdminAuthWrapper';
import AddRouteForm from '@/components/AddRouteForm';

export default function AdminPage() {
  // Get user info from both auth providers
  const { data: session } = useSession();
  const { user: netlifyUser } = useNetlifyAuth();
  
  // Display the appropriate welcome message based on which auth system is active
  const userEmail = netlifyUser?.email || session?.user?.email || 'Admin User';
  
  // The AdminAuthWrapper handles all the authentication checking and redirects
  return (
    <AdminAuthWrapper>
      <div>
        <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
        <p className="mb-4">Welcome, {userEmail}!</p>
        
        {/* Diagnostic information */}
        <div className="mb-6 rounded-md bg-blue-50 p-4">
          <p className="font-medium">Authentication Info:</p>
          <ul className="mt-1 list-inside list-disc text-sm text-gray-700">
            <li>NextAuth: {session ? 'Authenticated' : 'Not authenticated'}</li>
            <li>Netlify Identity: {netlifyUser ? 'Authenticated' : 'Not authenticated'}</li>
          </ul>
        </div>

        {/* Placeholder for the Add Route Form */}
        <div className="mt-8 rounded-lg border bg-white p-6 shadow-md">
          <h2 className="mb-4 text-xl font-semibold">Add New Route</h2>
          <AddRouteForm />
        </div>

        {/* Add other admin sections later */}
      </div>
    </AdminAuthWrapper>
  );
}
