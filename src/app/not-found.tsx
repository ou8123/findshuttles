import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h2 className="text-3xl font-bold mb-4">Page Not Found</h2>
      <p className="text-gray-600 mb-6">Sorry, the page you are looking for does not exist.</p>
      <Link href="/" className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700">
        Return Home
      </Link>
    </div>
  );
}