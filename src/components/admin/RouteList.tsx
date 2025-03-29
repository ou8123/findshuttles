"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Route {
    id: string;
    routeSlug: string;
    displayName: string;
    departureCity: { name: string };
    destinationCity: { name: string };
    departureCountry: { name: string };
    destinationCountry: { name: string };
}

const RouteList = () => {
    const [routes, setRoutes] = useState<Route[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteStatus, setDeleteStatus] = useState<{ id: string | null; message: string; success: boolean } | null>(null);

    const fetchRoutes = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/admin/routes');
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch routes');
            }
            const data: Route[] = await response.json();
            setRoutes(data);
        } catch (err: unknown) {
            console.error("Failed to fetch routes:", err);
            let message = "Could not load routes.";
            if (err instanceof Error) {
                message = err.message;
            }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRoutes();
    }, []);

    const handleDelete = async (routeId: string, routeDesc: string) => {
        if (!window.confirm(`Are you sure you want to delete the route "${routeDesc}"?`)) {
            return;
        }

        setDeleteStatus({ id: routeId, message: 'Deleting...', success: false });

        try {
            const response = await fetch(`/api/admin/routes/${routeId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            // Refresh the routes list instead of filtering locally
            await fetchRoutes();
            setDeleteStatus({ id: null, message: `Successfully deleted "${routeDesc}".`, success: true });
            setTimeout(() => setDeleteStatus(null), 3000);

        } catch (error: unknown) {
            console.error(`Failed to delete route ${routeId}:`, error);
            let message = "Failed to delete route.";
            if (error instanceof Error) {
                message = error.message;
            }
            setDeleteStatus({ id: routeId, message: message, success: false });
            setTimeout(() => setDeleteStatus(null), 5000);
        }
    };

    if (isLoading) {
        return <div className="text-center p-4">Loading routes...</div>;
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
                            Display Name
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Route Details
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
                    {routes.length === 0 && (
                        <tr>
                            <td colSpan={4} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                                No routes found. Add one using the button above.
                            </td>
                        </tr>
                    )}
                    {routes.map((route) => {
                        const routeDesc = `${route.departureCity.name} - ${route.destinationCity.name}`;
                        const isDeleting = deleteStatus?.id === route.id;
                        return (
                            <tr key={route.id} className={isDeleting ? 'opacity-50' : ''}>
                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                    {route.displayName}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                    {routeDesc}
                                    <span className="block text-xs text-gray-500">
                                        ({route.departureCountry.name} - {route.destinationCountry.name})
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {route.routeSlug}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                    <Link 
                                        href={`/admin/routes/edit/${route.id}`} 
                                        className={`text-indigo-600 hover:text-indigo-900 ${isDeleting ? 'pointer-events-none' : ''}`}
                                    >
                                        Edit
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(route.id, route.displayName)}
                                        disabled={isDeleting}
                                        className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
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

export default RouteList;