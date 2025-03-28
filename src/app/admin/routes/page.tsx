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
    redirect('/api/auth/signin?callbackUrl=/admin/routes');
  }

  // The actual data fetching and rendering is delegated to the client component
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Routes</h1>
        {/* Link to AddRouteForm component, which is on the main admin page */}
        <Link href="/admin" className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
            Add New Route
        </Link>
      </div>

      {/* Render the client component which handles fetching and interactions */}
      {/* We will create RouteList next */}
      <RouteList />
    </div>
  );
}