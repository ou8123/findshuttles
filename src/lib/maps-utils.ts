import { decode } from '@googlemaps/polyline-codec';

export function decodePolyline(points: string): google.maps.LatLngLiteral[] {
  return decode(points).map(([lat, lng]) => ({ lat, lng }));
}

export function createLatLngPath(points: google.maps.LatLngLiteral[]): google.maps.LatLngLiteral[] {
  // Just return the literals - DirectionsRenderer will handle conversion
  return points;
}
