import { NextResponse } from 'next/server';
import { Client, DirectionsRequest, TravelMode, LatLng } from '@googlemaps/google-maps-services-js';

export const runtime = 'nodejs';

const client = new Client({});

export async function GET(req: Request) {
  console.log(`[API /api/routes/directions] Received request for URL: ${req.url}`); // Add logging
  try {
    const { searchParams } = new URL(req.url);
    const origin = searchParams.get('origin');
    const destination = searchParams.get('destination');
    const waypointsParam = searchParams.get('waypoints');

    const apiKey = process.env.GOOGLE_MAPS_SERVER_API_KEY;

    if (!apiKey) {
      console.error('Google Maps Server API key is not configured.');
      return NextResponse.json({ error: 'Maps service is not configured.' }, { status: 500 });
    }

    if (!origin || !destination) {
      return NextResponse.json({ error: 'Missing origin or destination parameters.' }, { status: 400 });
    }

    // Parse waypoints if provided
    let waypointCoords: LatLng[] | undefined;
    if (waypointsParam) {
      try {
        const parsed = JSON.parse(waypointsParam);
        if (!Array.isArray(parsed)) {
          throw new Error('Waypoints must be an array');
        }
        // Ensure waypoints are in LatLng format
        waypointCoords = parsed.map(wp => {
          const lat = parseFloat(wp.lat);
          const lng = parseFloat(wp.lng);
          if (isNaN(lat) || isNaN(lng)) {
            throw new Error('Invalid waypoint coordinates');
          }
          return { lat, lng };
        });
      } catch (e) {
        return NextResponse.json({ error: 'Invalid waypoints format' }, { status: 400 });
      }
    }

    // Parse origin/destination coordinates
    const parseCoords = (coords: string): LatLng => {
      const [lat, lng] = coords.split(',').map(Number);
      if (isNaN(lat) || isNaN(lng)) {
        throw new Error('Invalid coordinates format');
      }
      return { lat, lng };
    };

    const originCoords = parseCoords(origin);
    const destinationCoords = parseCoords(destination);

    const directionsRequest: DirectionsRequest = {
      params: {
        origin: originCoords,
        destination: destinationCoords,
        key: apiKey,
        mode: TravelMode.driving,
        region: 'CR' // Explicitly bias to Costa Rica
        // Temporarily removing waypoints from the request to isolate the issue
        // ...(waypointCoords && waypointCoords.length > 0 && {
        //   waypoints: waypointCoords, 
        //   optimize: false
        // })
      }
    };

    const response = await client.directions(directionsRequest);

    if (response.data.status !== 'OK') {
      console.error('Google Directions API Error:', response.data.error_message || response.data.status);
      return NextResponse.json(
        { error: `Failed to fetch directions: ${response.data.error_message || response.data.status}` },
        { status: response.status }
      );
    }

    // Return the raw response data directly from the Google Maps client
    // The client-side DirectionsRenderer should be able to handle this structure.
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error in directions API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error fetching directions.' },
      { status: 500 }
    );
  }
}
