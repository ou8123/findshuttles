"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSecureAdminPath } from '@/middleware'; // Import the helper function

interface City {
    id: string;
    name: string;
    slug: string;
    country: {
        name: string;
    };
}

const CityList = () => {
    const [cities, setCities] = useState<City[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteStatus, setDeleteStatus] = useState<{ id: string | null; message: string; success: boolean } | null>(null);

    const fetchCities = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/cities');
            if (!response.ok) {
                throw new Error('Failed to fetch cities');
            }
            const data = await response.json();
            setCities(data);
        } catch (err) {
            console.error("Failed to fetch cities:", err);
            setError("Could not load cities.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCities();
    }, []);

    const handleDelete = async (cityId: string, cityName: string) => {
        if (!window.confirm(`Are you sure you want to delete the city "${cityName}"?`)) {
            return;
        }

        setDeleteStatus({ id: cityId, message: 'Deleting...', success: false });

        try {
            const response = await fetch(`/api/admin/cities/${cityId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete city');
            }

            setCities(cities.filter(city => city.id !== cityId));
            setDeleteStatus({ id: null, message: `Successfully deleted "${cityName}".`, success: true });
            setTimeout(() => setDeleteStatus(null), 3000);

        } catch (error) {
            console.error("Failed to delete city:", error);
            setDeleteStatus({ id: cityId, message: "Failed to delete city.", success: false });
            setTimeout(() => setDeleteStatus(null), 5000);
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
            {deleteStatus && (
                <div className={`p-3 ${deleteStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-sm rounded-t-lg`}>
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
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {cities.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                No cities found. Add one using the button above.
                            </td>
                        </tr>
                    )}
                    {cities.map((city) => {
                        const isDeleting = deleteStatus?.id === city.id;
                        
                        // Use the secure admin path for edit links
                        const secureEditPath = getSecureAdminPath(`/admin/cities/edit/${city.id}`);
                        
                        return (
                            <tr key={city.id} className={isDeleting ? 'opacity-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {city.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {city.country.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {city.slug}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <Link 
                                        href={secureEditPath}
                                        className={`text-indigo-600 hover:text-indigo-900 ${isDeleting ? 'pointer-events-none' : ''}`}
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(city.id, city.name)}
                                        disabled={isDeleting}
                                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed ml-2"
                                    >
                                        {isDeleting ? 'Deleting...' : 'Delete'}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default CityList;
