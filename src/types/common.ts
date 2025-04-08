// Common type definitions for the application

export type Waypoint = {
  id?: string; // Made id optional as it might not be in the mapWaypoints JSON
  name: string;
  lat: number;
  lng: number;
  description?: string;
};

// Add other common types below as needed
