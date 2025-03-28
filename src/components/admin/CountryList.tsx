"use client"; // This component handles state and interactions

import { useState, useEffect } from 'react';
import Link from 'next/link';

// Interface for Country data
interface Country {
    id: string;
    name: string;
    slug: string;
}

const CountryList = () => {
    const [countries, setCountries] = useState<Country[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteStatus, setDeleteStatus] = useState<{ id: string | null; message: string; success: boolean } | null>(null);

    // Fetch countries on component mount
    useEffect(() => {
        const fetchCountries = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/admin/countries'); // Use the API route
                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to fetch countries');
                }
                const data: Country[] = await response.json();
                setCountries(data);
            } catch (err: unknown) {
                console.error("Failed to fetch countries:", err);
                let message = "Could not load countries.";
                if (err instanceof Error) {
                    message = err.message;
                }
                setError(message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCountries();
    }, []); // Empty dependency array runs once on mount

    // Handle Delete button click
    const handleDelete = async (countryId: string, countryName: string) => {
        setDeleteStatus({ id: countryId, message: 'Deleting...', success: false }); // Indicate deleting

        if (!window.confirm(`Are you sure you want to delete the country "${countryName}"? This might fail if it has related cities or routes.`)) {
            setDeleteStatus(null); // Clear status if cancelled
            return;
        }

        try {
            const response = await fetch(`/api/admin/countries/${countryId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                // If status is 204 No Content, it was successful but no body
                if (response.status === 204) {
                   // Handled in finally block by filtering state
                } else {
                    const result = await response.json();
                    throw new Error(result.error || `HTTP error! status: ${response.status}`);
                }
            }

             // Success: Remove country from local state
            setCountries(prevCountries => prevCountries.filter(country => country.id !== countryId));
            setDeleteStatus({ id: null, message: `Successfully deleted "${countryName}".`, success: true });
             // Clear success message after a few seconds
            setTimeout(() => setDeleteStatus(null), 3000);


        } catch (error: unknown) {
            console.error(`Failed to delete country ${countryId}:`, error);
            let message = "Failed to delete country.";
            if (error instanceof Error) {
                message = error.message;
            }
            setDeleteStatus({ id: countryId, message: message, success: false });
            // Optionally clear error message after some time
            // setTimeout(() => setDeleteStatus(prev => (prev?.id === countryId ? null : prev)), 5000);
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
                            Name
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
                    {countries.length === 0 && (
                        <tr>
                            <td colSpan={3} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                No countries found.
                            </td>
                        </tr>
                    )}
                    {countries.map((country) => (
                        <tr key={country.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {country.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {country.slug}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                <Link href={`/admin/countries/edit/${country.id}`} className="text-indigo-600 hover:text-indigo-900">
                                    Edit
                                </Link>
                                <button
                                    onClick={() => handleDelete(country.id, country.name)}
                                    disabled={deleteStatus?.id === country.id} // Disable button while deleting this specific item
                                    className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {deleteStatus?.id === country.id ? 'Deleting...' : 'Delete'}
                                </button>
                                {/* Display specific error for this row */}
                                {deleteStatus?.id === country.id && !deleteStatus.success && (
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

export default CountryList;