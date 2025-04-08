"use client";

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getSecureAdminPath } from '@/middleware'; // Import the helper function

interface Route {
    id: string;
    routeSlug: string;
    displayName: string;
    departureCity: { name: string };
    destinationCity: { name: string };
    departureCountry: { name: string };
    destinationCountry: { name: string };
}

interface PaginationData {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
}

interface RoutesResponse {
    routes: Route[];
    pagination: PaginationData;
}

const RouteList = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    
    // Get query params with defaults
    const currentPage = parseInt(searchParams.get('page') || '1');
    const searchQuery = searchParams.get('search') || '';
    const pageSize = 25; // Constant page size

    // State variables
    const [routes, setRoutes] = useState<Route[]>([]);
    const [pagination, setPagination] = useState<PaginationData>({
        page: 1,
        limit: pageSize,
        totalItems: 0,
        totalPages: 1,
        hasMore: false
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteStatus, setDeleteStatus] = useState<{ id: string | null; message: string; success: boolean } | null>(null);
    const [searchTerm, setSearchTerm] = useState(searchQuery);

    // Function to update URL with search parameters
    const updateUrlParams = (page: number, search: string) => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', page.toString());
        if (search) params.set('search', search);
        
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.pushState({}, '', newUrl);
    };

    // Fetch routes with pagination and search
    const fetchRoutes = async (page: number = 1, search: string = '') => {
        setIsLoading(true);
        setError(null);
        try {
            // Build query parameters
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', pageSize.toString());
            if (search) params.append('search', search);

            const response = await fetch(`/api/admin/routes?${params.toString()}`);
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch routes');
            }
            
            const data = await response.json();
            
            // Make sure we handle both response formats
            // Newer format: { routes: Route[], pagination: {...} }
            // Legacy format: Route[]
            const routes = Array.isArray(data.routes) 
                ? data.routes 
                : Array.isArray(data) 
                    ? data 
                    : [];
                    
            const pagination = data.pagination || {
                page: 1,
                limit: pageSize,
                totalItems: routes.length,
                totalPages: Math.ceil(routes.length / pageSize),
                hasMore: false
            };
            
            setRoutes(routes);
            setPagination(pagination);
            
            // Update URL without page reload
            updateUrlParams(page, search);
            
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

    // Handle search submission
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchRoutes(1, searchTerm); // Always start from page 1 when searching
    };

    // Generate page number array for pagination controls
    const pageNumbers = useMemo(() => {
        const totalPages = pagination.totalPages;
        const currentPageNum = pagination.page;
        
        if (totalPages <= 7) {
            // Show all pages if 7 or fewer
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            // Show 1, ..., currentPage-1, currentPage, currentPage+1, ..., totalPages
            const pages = [1];
            
            // Add ellipsis if current page is not near the start
            if (currentPageNum > 3) {
                pages.push(-1); // -1 represents ellipsis
            }
            
            // Pages around current page
            const startPage = Math.max(2, currentPageNum - 1);
            const endPage = Math.min(totalPages - 1, currentPageNum + 1);
            
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
            
            // Add ellipsis if current page is not near the end
            if (currentPageNum < totalPages - 2) {
                pages.push(-2); // -2 represents ellipsis
            }
            
            // Add last page
            if (totalPages > 1) {
                pages.push(totalPages);
            }
            
            return pages;
        }
    }, [pagination.totalPages, pagination.page]);

    // Initial data fetch
    useEffect(() => {
        fetchRoutes(currentPage, searchQuery);
    }, [currentPage, searchQuery]);

    // Re-fetch data when the window gains focus (e.g., navigating back)
    useEffect(() => {
      const handleFocus = () => {
        console.log("RouteList focus detected, re-fetching routes...");
        // Fetch based on current URL params, not just page 1
        const currentParams = new URLSearchParams(window.location.search);
        const page = parseInt(currentParams.get('page') || '1');
        const search = currentParams.get('search') || '';
        fetchRoutes(page, search);
      };
      window.addEventListener('focus', handleFocus);
      return () => {
        window.removeEventListener('focus', handleFocus);
      };
    }, []); // Empty dependency array ensures this effect runs only once to set up listener

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
        <div>
            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-4 flex">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search routes by city, country, or name..."
                    className="flex-grow p-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                    type="submit"
                    className="bg-indigo-600 text-white px-4 py-2 rounded-r-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                    Search
                </button>
            </form>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                {deleteStatus && (
                    <div className={`p-3 ${deleteStatus.success ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} text-sm rounded-t-lg`}>
                        {deleteStatus.message}
                    </div>
                )}
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                                #
                            </th>
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
                    {/* Add detailed logging before mapping */}
                    {/* {console.log("RouteList: Data received by component:", JSON.stringify(routes, null, 2))} */}
                    {routes.map((route, index) => {
                        // Simple log to see if this route is processed
                        // console.log(`RouteList: Processing route index ${index}, displayName: ${route?.displayName}`); // Keep this commented for now
                        // Basic check for essential data needed for rendering
                        if (!route || !route.id || !route.departureCity?.name || !route.destinationCity?.name || !route.departureCountry?.name || !route.destinationCountry?.name) {
                          // Detailed logging for skipped route
                          const missingFields: string[] = []; // Explicitly type as string array
                          if (!route) {
                              missingFields.push('route object');
                          } else {
                              if (!route.id) missingFields.push('id');
                              if (!route.departureCity?.name) missingFields.push('departureCity.name');
                              if (!route.destinationCity?.name) missingFields.push('destinationCity.name');
                              if (!route.departureCountry?.name) missingFields.push('departureCountry.name');
                              if (!route.destinationCountry?.name) missingFields.push('destinationCountry.name');
                          }
                          console.warn(`RouteList: Skipping route at index ${index} (ID: ${route?.id || 'N/A'}) due to missing data: ${missingFields.join(', ')}. Route data:`, route);
                          return null; // Skip rendering this row if essential data is missing
                        }
                        const routeDesc = `${route.departureCity.name} - ${route.destinationCity.name}`;
                        const isDeleting = deleteStatus?.id === route.id;

                            // Use the secure admin path for the edit link
                            const secureEditPath = getSecureAdminPath(`/admin/routes/edit/${route.id}`);
                            
                            return (
                                <tr key={route.id} className={isDeleting ? 'opacity-50' : ''}>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-500 w-12">
                                        {/* Calculate reversed number based on total items and pagination */}
                                        {pagination.totalItems - ((pagination.page - 1) * pageSize + index)}
                                    </td>
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
                                            href={secureEditPath} 
                                            className={`text-indigo-600 hover:text-indigo-900 ${isDeleting ? 'pointer-events-none' : ''}`}
                                        >
                                            Edit
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(route.id, route.displayName)}
                                            disabled={isDeleting}
                                            className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed mx-2"
                                        >
                                            {isDeleting ? 'Deleting...' : 'Delete'}
                                        </button>
                                        <Link 
                                            href={`/routes/${route.routeSlug}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-green-600 hover:text-green-900"
                                        >
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Pagination controls */}
                {pagination.totalPages > 1 && (
                    <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                    <span className="font-medium">
                                        {Math.min(pagination.page * pagination.limit, pagination.totalItems)}
                                    </span>{' '}
                                    of <span className="font-medium">{pagination.totalItems}</span> results
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    {/* Previous Page */}
                                    <button
                                        onClick={() => fetchRoutes(pagination.page - 1, searchTerm)}
                                        disabled={pagination.page === 1}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                                            pagination.page === 1 
                                                ? 'text-gray-300 cursor-not-allowed' 
                                                : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="sr-only">Previous</span>
                                        &larr;
                                    </button>

                                    {/* Page Numbers */}
                                    {pageNumbers.map((pageNum, idx) => {
                                        // Handle ellipsis
                                        if (pageNum < 0) {
                                            return (
                                                <span key={`ellipsis-${idx}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                                    ...
                                                </span>
                                            );
                                        }

                                        // Regular page number
                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => fetchRoutes(pageNum, searchTerm)}
                                                className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${
                                                    pagination.page === pageNum
                                                        ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                                        : 'bg-white text-gray-500 hover:bg-gray-50'
                                                }`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}

                                    {/* Next Page */}
                                    <button
                                        onClick={() => fetchRoutes(pagination.page + 1, searchTerm)}
                                        disabled={!pagination.hasMore}
                                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                                            !pagination.hasMore 
                                                ? 'text-gray-300 cursor-not-allowed' 
                                                : 'text-gray-500 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="sr-only">Next</span>
                                        &rarr;
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RouteList;
