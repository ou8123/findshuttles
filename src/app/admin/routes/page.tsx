import { getServerSession } from 'next-auth/next';
import { authOptions } from "@/lib/auth"; // Import from new location
import { redirect } from 'next/navigation';
import Link from 'next/link';
import RouteList from '@/components/admin/RouteList'; // Import the client component (to be created)

// This page remains a server component primarily for the initial auth check
export default async function AdminRoutesPage() {
  const session = await getServerSession(authOptions);

  // Protect the page server-side
  if (!session || session.user?.role !== 'ADMIN') {
    // Use the stealth path for the callback URL
    redirect('/api/auth/signin?callbackUrl=/management-portal-8f7d3e2a1c/routes');
  }

  // The actual data fetching and rendering is delegated to the client component
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Routes</h1>
        {/* Link to AddRouteForm component, which is on the main admin page (using stealth path) */}
        <Link href="/management-portal-8f7d3e2a1c" className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
            Add New Route
        </Link>
      </div>

      {/* Render the client component which handles fetching and interactions */}
      {/* We will create RouteList next */}
      <RouteList />
    </div>
  );
}
