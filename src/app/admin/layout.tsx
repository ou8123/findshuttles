import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth"; // Import from new location
import { redirect } from 'next/navigation';
import Link from 'next/link';
import React from 'react';
import AdminSidebarNav from '@/components/admin/AdminSidebarNav'; // Import the client component

// Centralized Auth Check for all Admin routes
async function checkAdminAuth() {
    const session = await getServerSession(authOptions);
    if (!session || session.user?.role !== 'ADMIN') {
        console.log("Admin layout access denied for user:", session?.user?.email ?? 'Not logged in');
        redirect('/api/auth/signin?callbackUrl=/admin'); // Redirect to signin
    }
    return session; // Return session if authorized
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await checkAdminAuth(); // Ensure user is admin before rendering layout

  // Basic Sidebar Navigation Links
  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/countries', label: 'Countries' },
    { href: '/admin/cities', label: 'Cities' },
    { href: '/admin/routes', label: 'Routes' }, // Add link for future routes page
    // Add more links as needed
  ];

  return (
    <div className="flex min-h-screen"> {/* Use flex for sidebar layout */}
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-6">Admin Menu</h2>
        {/* Use the client component for navigation */}
        <AdminSidebarNav navItems={navItems} />
        {/* Optional: Add user info or logout button at the bottom */}
        <div className="mt-auto">
             <Link href="/api/auth/signout" className="block py-2 px-3 rounded hover:bg-gray-700 transition-colors text-sm">
                Sign Out
             </Link>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-grow p-6 bg-gray-100"> {/* Main content takes remaining space */}
        {children} {/* The content of the specific admin page */}
      </main>
    </div>
  );
}