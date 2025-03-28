import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import CountryList from '@/components/admin/CountryList'; // Import the client component

// This page remains a server component primarily for the initial auth check
export default async function AdminCountriesPage() {
  const session = await getServerSession(authOptions);

  // Protect the page server-side
  if (!session || session.user?.role !== 'ADMIN') {
    redirect('/api/auth/signin?callbackUrl=/admin/countries');
  }

  // The actual data fetching and rendering is delegated to the client component
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Countries</h1>
        <Link href="/admin/countries/new" className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
            Add New Country
        </Link>
      </div>

      {/* Render the client component which handles fetching and interactions */}
      <CountryList />
    </div>
  );
}