"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getSecureAdminPath } from '@/middleware'; // Import the helper function

interface Country {
    id: string;
    name: string;
    code: string;
}

const CountryList = () => {
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteStatus, setDeleteStatus] = useState<{ id: string | null; message: string; success: boolean } | null>(null);

    const fetchCountries = async () => {
        setIsLoading(true);
        try {
            const response = await fetch('/api/admin/countries');
            if (!response.ok) {
                throw new Error('Failed to fetch countries');
            }
            const data = await response.json();
            setCountries(data);
        } catch (err) {
            console.error("Failed to fetch countries:", err);
            setError("Could not load countries.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCountries();
    }, []);

    const handleDelete = async (countryId: string, countryName: string) => {
        if (!window.confirm(`Are you sure you want to delete the country "${countryName}"?`)) {
            return;
        }

        setDeleteStatus({ id: countryId, message: 'Deleting...', success: false });

        try {
            const response = await fetch(`/api/admin/countries/${countryId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Failed to delete country');
            }

            setCountries(countries.filter(country => country.id !== countryId));
            setDeleteStatus({ id: null, message: `Successfully deleted "${countryName}".`, success: true });
            setTimeout(() => setDeleteStatus(null), 3000);

        } catch (error) {
            console.error("Failed to delete country:", error);
            setDeleteStatus({ id: countryId, message: "Failed to delete country.", success: false });
            setTimeout(() => setDeleteStatus(null), 5000);
        }
    };

    if (isLoading) {
        return <div className="text-center p-4">Loading countries...</div>;
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
                            Country Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Country Code
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {countries.length === 0 && (
                        <tr>
                            <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                No countries found. Add one using the button above.
                            </td>
                        </tr>
                    )}
                    {countries.map((country) => {
                        const isDeleting = deleteStatus?.id === country.id;
                        
                        // Use the secure admin path for edit links
                        const secureEditPath = getSecureAdminPath(`/admin/countries/edit/${country.id}`);
                        
                        return (
                            <tr key={country.id} className={isDeleting ? 'opacity-50' : ''}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {country.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {country.code}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <Link 
                                        href={secureEditPath}
                                        className={`text-indigo-600 hover:text-indigo-900 ${isDeleting ? 'pointer-events-none' : ''}`}
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(country.id, country.name)}
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

export default CountryList;
