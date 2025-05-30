"use client";

import { useState, useEffect, useMemo } from 'react'; // Added useMemo
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation'; // Import useRouter, useSearchParams
import { getSecureAdminPath } from '@/middleware'; // Import the helper function

interface Country {
    id: string;
    name: string;
    slug: string; // Assuming slug exists based on API
    // code: string; // Assuming code might not be needed or fetched anymore
}

// Add PaginationData interface
interface PaginationData {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
}

const CountryList = () => {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get query params with defaults
    const currentPage = parseInt(searchParams.get('page') || '1');
    const searchQuery = searchParams.get('search') || '';
    const pageSize = 25; // Or your preferred page size

    // State variables
    const [countries, setCountries] = useState<Country[]>([]);
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

     // Function to update URL
    const updateUrlParams = (page: number, search: string) => {
        const params = new URLSearchParams();
        if (page > 1) params.set('page', page.toString());
        if (search) params.set('search', search);
        const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
        window.history.pushState({}, '', newUrl);
    };

    // Updated fetchCountries function
    const fetchCountries = async (page: number = 1, search: string = '') => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', pageSize.toString());
            if (search) params.append('search', search);

            const response = await fetch(`/api/admin/countries?${params.toString()}`);
            if (!response.ok) {
                 const errData = await response.json();
                 throw new Error(errData.error || 'Failed to fetch countries');
            }
            const data = await response.json();
             // Expect { countries: [], pagination: {} }
            setCountries(data.countries || []);
            setPagination(data.pagination || { page: 1, limit: pageSize, totalItems: 0, totalPages: 1, hasMore: false });
            updateUrlParams(page, search);
        } catch (err: unknown) {
            console.error("Failed to fetch countries:", err);
             let message = "Could not load countries.";
             if (err instanceof Error) { message = err.message; }
            setError(message);
        } finally {
            setIsLoading(false);
        }
    };

     // Handle search submission
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchCountries(1, searchTerm); // Reset to page 1 on new search
    };

     // Generate page numbers
     const pageNumbers = useMemo(() => {
        const totalPages = pagination.totalPages;
        const currentPageNum = pagination.page;
        if (totalPages <= 7) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        } else {
            const pages = [1];
            if (currentPageNum > 3) pages.push(-1);
            const startPage = Math.max(2, currentPageNum - 1);
            const endPage = Math.min(totalPages - 1, currentPageNum + 1);
            for (let i = startPage; i <= endPage; i++) pages.push(i);
            if (currentPageNum < totalPages - 2) pages.push(-2);
            if (totalPages > 1) pages.push(totalPages);
            return pages;
        }
    }, [pagination.totalPages, pagination.page]);

    // Initial data fetch based on URL params
    useEffect(() => {
        fetchCountries(currentPage, searchQuery);
    }, [currentPage, searchQuery]);

     // Re-fetch data when the window gains focus
     useEffect(() => {
       const handleFocus = () => {
         console.log("CountryList focus detected, re-fetching countries...");
         fetchCountries(pagination.page, searchTerm); // Fetch current page/search
       };
       window.addEventListener('focus', handleFocus);
       return () => {
         window.removeEventListener('focus', handleFocus);
       };
     }, [pagination.page, searchTerm]); // Re-add listener if page/search changes


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
                 const result = await response.json();
                 throw new Error(result.error || 'Failed to delete country');
            }

            // Refresh list instead of filtering locally
            await fetchCountries(pagination.page, searchTerm);
            setDeleteStatus({ id: null, message: `Successfully deleted "${countryName}".`, success: true });
            setTimeout(() => setDeleteStatus(null), 3000);

        } catch (error: unknown) {
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
        <div>
             {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-4 flex">
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search countries by name or slug..."
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
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Country Name
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
                                    {country.slug}
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

             {/* Pagination controls */}
             {pagination.totalPages > 1 && (
                <div className="px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Showing <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span> to{' '}
                                <span className="font-medium">{Math.min(pagination.page * pagination.limit, pagination.totalItems)}</span> of <span className="font-medium">{pagination.totalItems}</span> results
                            </p>
                        </div>
                        <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                <button
                                    onClick={() => fetchCountries(pagination.page - 1, searchTerm)}
                                    disabled={pagination.page === 1}
                                    className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${pagination.page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    &larr; <span className="sr-only">Previous</span>
                                </button>
                                {pageNumbers.map((pageNum, idx) => pageNum < 0 ? (
                                    <span key={`ellipsis-${idx}`} className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">...</span>
                                ) : (
                                    <button
                                        key={pageNum}
                                        onClick={() => fetchCountries(pageNum, searchTerm)}
                                        className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium ${pagination.page === pageNum ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                                    >
                                        {pageNum}
                                    </button>
                                ))}
                                <button
                                    onClick={() => fetchCountries(pagination.page + 1, searchTerm)}
                                    disabled={!pagination.hasMore}
                                    className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${!pagination.hasMore ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'}`}
                                >
                                    <span className="sr-only">Next</span> &rarr;
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

export default CountryList;
