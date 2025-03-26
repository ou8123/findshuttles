import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import AddRouteForm from '@/components/AddRouteForm'; // Import the form component

export default async function AdminPage() {
  const session = await getServerSession(authOptions);

  // Check if user is logged in and has the ADMIN role
  if (!session || session.user?.role !== 'ADMIN') {
    // Redirect non-admins to the sign-in page or home page
    console.log("Admin page access denied for user:", session?.user?.email ?? 'Not logged in');
    redirect('/api/auth/signin?callbackUrl=/admin'); // Redirect to signin, then back to admin if successful
    // Or redirect('/');
  }

  // If authorized, render the admin content
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <p className="mb-4">Welcome, {session.user?.email}!</p>

      {/* Placeholder for the Add Route Form */}
      <div className="mt-8 p-6 border rounded-lg shadow-md bg-white">
        <h2 className="text-xl font-semibold mb-4">Add New Route</h2>
        <AddRouteForm />
      </div>

      {/* Add other admin sections later */}
    </div>
  );
}