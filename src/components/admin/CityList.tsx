"use client"; // This component handles state and interactions

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Interface for City data (including country name)
interface City {
    id: string;
    name: string;
    slug: string;
    latitude?: number | null;
    longitude?: number | null;
    countryId: string;
    country: { // Included from API
        name: string;
    };
}

const CityList = () => {
    const [cities, setCities] = useState<City[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteStatus, setDeleteStatus] = useState<{ id: string | null; message: string; success: boolean } | null>(null);

    // Fetch cities on component mount
    useEffect(() => {
        const fetchCities = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // TODO: Add filtering options later if needed (e.g., by country)
                const response = await fetch('/api/admin/cities'); // Use the API route
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to fetch cities');
                }
                const data: City[] = await response.json();
                setCities(data);
            } catch (err: any) {
                console.error("Failed to fetch cities:", err);
                setError(err.message || "Could not load cities.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchCities();
    }, []); // Empty dependency array runs once on mount

    // Handle Delete button click
    const handleDelete = async (cityId: string, cityName: string) => {
        setDeleteStatus({ id: cityId, message: 'Deleting...', success: false }); // Indicate deleting

        if (!window.confirm(`Are you sure you want to delete the city "${cityName}"? This might fail if it has related routes.`)) {
            setDeleteStatus(null); // Clear status if cancelled
            return;
        }

        try {
            const response = await fetch(`/api/admin/cities/${cityId}`, {
                method: 'DELETE',
            });

            if (!response.ok && response.status !== 204) { // Check for non-204 errors
                 const result = await response.json();
                 throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

             // Success (status 200 OK or 204 No Content): Remove city from local state
            setCities(prevCities => prevCities.filter(city => city.id !== cityId));
            setDeleteStatus({ id: null, message: `Successfully deleted "${cityName}".`, success: true });
             // Clear success message after a few seconds
            setTimeout(() => setDeleteStatus(null), 3000);


        } catch (error: any) {
            console.error(`Failed to delete city ${cityId}:`, error);
            setDeleteStatus({ id: cityId, message: error.message || "Failed to delete city.", success: false });
            // Optionally clear error message after some time
            // setTimeout(() => setDeleteStatus(prev => (prev?.id === cityId ? null : prev)), 5000);
        }
    };


    if (isLoading) {
        return <div className="text-center p-4">Loading cities...</div>;
    }

    if (error) {
        return <div className="text-center p-4 text-red-600">{error}</div>;
    }

    return (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
            {/* Display general delete success message */}
             {deleteStatus?.success && deleteStatus.id === null && (
                <div className="p-3 bg-green-100 text-green-700 text-sm rounded-t-lg">
                    {deleteStatus.message}
                </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            City Name
                        </th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Country
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Slug
                        </th>
                         <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Coords (Lat, Lng)
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {cities.length === 0 && (
                        <tr>
                            <td colSpan={5} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                No cities found.
                            </td>
                        </tr>
                    )}
                    {cities.map((city) => (
                        <tr key={city.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {city.name}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {city.country.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {city.slug}
                            </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {city.latitude != null && city.longitude != null
                                    ? `${city.latitude.toFixed(4)}, ${city.longitude.toFixed(4)}`
                                    : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <Link href={`/admin/cities/edit/${city.id}`} className="text-indigo-600 hover:text-indigo-900">
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDelete(city.id, city.name)}
                                    disabled={deleteStatus?.id === city.id} // Disable button while deleting this specific item
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deleteStatus?.id === city.id ? 'Deleting...' : 'Delete'}
                                </button>
                                {/* Display specific error for this row */}
                                {deleteStatus?.id === city.id && !deleteStatus.success && (
                                     <span className="text-red-500 text-xs ml-2">{deleteStatus.message}</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default CityList;