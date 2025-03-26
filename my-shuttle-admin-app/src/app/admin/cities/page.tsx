import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CityList from '@/components/admin/CityList'; // Import the client component (to be created)

// This page remains a server component primarily for the initial auth check
export default async function AdminCitiesPage() {
  const session = await getServerSession(authOptions);

  // Protect the page server-side
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/api/auth/signin?callbackUrl=/admin/cities');
  }

  // The actual data fetching and rendering is delegated to the client component
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Cities</h1>
        <Link href="/admin/cities/new" className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
            Add New City
        </Link>
      </div>

      {/* Render the client component which handles fetching and interactions */}
      {/* We will create CityList next */}
      <CityList />
    </div>
  );
}