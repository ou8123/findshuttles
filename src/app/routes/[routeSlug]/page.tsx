import prisma from '@/lib/prisma';
import { notFound } from 'next/navigation';
import RouteMap from '@/components/RouteMap'; // Import the map component

// Define the expected shape of the props, including the dynamic parameter
interface RoutePageProps {
  params: {
    routeSlug: string;
  };
}

// Function to fetch route data based on the slug string
async function getRouteData(slug: string) {
  // Removed internal slug extraction and check
  try {
    const route = await prisma.route.findUnique({
      where: { routeSlug: slug },
      include: {
        departureCity: {
          select: { name: true, latitude: true, longitude: true } // Include coordinates
        },
        departureCountry: { select: { name: true } },
        destinationCity: {
          select: { name: true, latitude: true, longitude: true } // Include coordinates
        },
        destinationCountry: { select: { name: true } },
      },
    });
    return route;
  } catch (error) {
    console.error(`Error fetching route data for slug ${slug}:`, error);
    return null; // Return null or throw an error based on desired handling
  }
}

// The Page component - Destructure params directly in the signature
export default async function RoutePage({ params }: RoutePageProps) {
  // Extract the slug string first
  const currentSlug = params.routeSlug;
  // Pass the slug string to the data fetching function
  const routeData = await getRouteData(currentSlug);

  // If no route data is found for the slug, show a 404 page
  if (!routeData) {
    notFound();
  }

  // Basic display of route information
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">
        Shuttle from {routeData.departureCity.name} to {routeData.destinationCity.name}
      </h1>
      <p className="mb-2">
        Country: {routeData.departureCountry.name} to {routeData.destinationCountry.name}
      </p>
      <p className="mb-4 text-gray-600">Route Slug: {routeData.routeSlug}</p>

      {/* Map Display Section */}
      {routeData.departureCity?.latitude && routeData.departureCity?.longitude &&
       routeData.destinationCity?.latitude && routeData.destinationCity?.longitude && (
        <div className="my-8"> {/* Add margin */}
          <h2 className="text-xl font-semibold mb-3">Route Map</h2>
          <RouteMap
            departureLat={routeData.departureCity.latitude}
            departureLng={routeData.departureCity.longitude}
            destinationLat={routeData.destinationCity.latitude}
            destinationLng={routeData.destinationCity.longitude}
          />
        </div>
      )}

      {/* Display SEO Description if available */}
      {routeData.seoDescription && (
        <div className="mb-6 p-4 bg-gray-100 rounded">
          <h2 className="text-xl font-semibold mb-2">Route Description</h2>
          <p>{routeData.seoDescription}</p>
        </div>
      )}

      {/* Render the Viator Widget Code */}
      {/* IMPORTANT: Rendering raw HTML like this can be dangerous if the source is not trusted.
           Ensure viatorWidgetCode only contains safe script/HTML tags from Viator.
           Consider sanitization or alternative rendering methods if unsure. */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-2">Book Your Shuttle</h2>
        {routeData.viatorWidgetCode ? (
          <div dangerouslySetInnerHTML={{ __html: routeData.viatorWidgetCode }} />
        ) : (
          <p>Booking information currently unavailable.</p>
        )}
      </div>

      {/* Placeholder for future FAQs */}
      {/* <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">Frequently Asked Questions</h2>
        <p>FAQs will be displayed here...</p>
      </div> */}
    </div>
  );
}

// Optional: generateStaticParams to pre-render routes at build time
// This improves performance but requires knowing all possible slugs beforehand.
// export async function generateStaticParams() {
//   try {
//     const routes = await prisma.route.findMany({
//       select: { routeSlug: true },
//     });
//     return routes.map((route) => ({
//       routeSlug: route.routeSlug,
//     }));
//   } catch (error) {
//     console.error("Error generating static params for routes:", error);
//     return []; // Return empty array on error
//   }
// }

// Optional: Add revalidation if route data changes
// export const revalidate = 60; // Revalidate every 60 seconds