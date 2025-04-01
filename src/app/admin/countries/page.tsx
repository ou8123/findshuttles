import Link from 'next/link';
import CountryList from '@/components/admin/CountryList'; // Import the client component
import { getSecureAdminPath } from '@/middleware'; // Import the helper function
// Auth check is now handled by layout.tsx

// This page remains a server component but doesn't need the auth check itself
export default async function AdminCountriesPage() {
 // No need for session check here anymore

  // Get the secure stealth URL for the "Add New" button
  const secureNewCountryPath = getSecureAdminPath('/admin/countries/new');

  // Render the page structure, delegating list rendering to the client component
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Countries</h1>
        <Link href={secureNewCountryPath} className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
            Add New Country
        </Link>
      </div>

      {/* Render the client component which handles fetching and interactions */}
      <CountryList />
    </div>
  );
}
