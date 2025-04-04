import { NextResponse } from 'next/server';
import axios from 'axios';

// Define the expected structure from Google Directions API response
interface GoogleDirectionsResponse {
  routes: {
    bounds: {
      northeast: { lat: number; lng: number };
      southwest: { lat: number; lng: number };
    };
    overview_polyline?: {
      points: string;
    };
    // other properties omitted for brevity
  }[];
  status: string;
  error_message?: string;
}

// Define the structure we want to return from our API
interface DirectionsData {
  overview_polyline?: string;
  bounds?: google.maps.LatLngBoundsLiteral; // Use the correct literal type
}


export const runtime = 'nodejs'; // Use Node.js runtime for server-side API key access

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const origin = searchParams.get('origin'); // e.g., "latitude,longitude" or address
  const destination = searchParams.get('destination'); // e.g., "latitude,longitude" or address

  const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

  if (!apiKey) {
    console.error('Google Maps API key is not configured.');
    return NextResponse.json({ error: 'Maps service is not configured.' }, { status: 500 });
  }

  if (!origin || !destination) {
    return NextResponse.json({ error: 'Missing origin or destination parameters.' }, { status: 400 });
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${apiKey}`;

  try {
    console.log(`Fetching directions: ${origin} -> ${destination}`);
    // Explicitly type the expected response structure
    const response = await axios.get<GoogleDirectionsResponse>(url);

    if (response.data.status !== 'OK') {
      console.error('Google Directions API Error:', response.data.error_message || response.data.status);
      return NextResponse.json(
        { error: `Failed to fetch directions: ${response.data.error_message || response.data.status}` },
        { status: 500 }
      );
    }

    const route = response.data.routes?.[0];
    if (!route) {
      return NextResponse.json({ error: 'No routes found.' }, { status: 404 });
    }

    // Transform Google's bounds into LatLngBoundsLiteral
    let boundsLiteral: google.maps.LatLngBoundsLiteral | undefined = undefined;
    if (route.bounds) {
        boundsLiteral = {
            north: route.bounds.northeast.lat,
            south: route.bounds.southwest.lat,
            east: route.bounds.northeast.lng,
            west: route.bounds.southwest.lng,
        };
    }

    // Return only the necessary data in the correct format
    const directionsData: DirectionsData = {
      overview_polyline: route.overview_polyline?.points,
      bounds: boundsLiteral, 
    };

    console.log("Successfully fetched directions, returning polyline and transformed bounds.");
    return NextResponse.json(directionsData);

  } catch (error) {
    console.error('Error fetching directions from Google Maps API:', error);
    return NextResponse.json({ error: 'Failed to fetch directions data.' }, { status: 500 });
  }
}
