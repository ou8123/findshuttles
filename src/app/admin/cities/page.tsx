import Link from 'next/link';
import CityList from '@/components/admin/CityList'; // Import the client component
// Auth check is now handled by layout.tsx

// This page remains a server component but doesn't need the auth check itself
export default async function AdminCitiesPage() {
 // No need for session check here anymore

  // Render the page structure, delegating list rendering to the client component
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Manage Cities</h1>
        <Link href="/admin/cities/new" className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700">
            Add New City
        </Link>
      </div>

      {/* Render the client component which handles fetching and interactions */}
      <CityList />
    </div>
  );
}