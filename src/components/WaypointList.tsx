// components/WaypointList.tsx
import { Waypoint } from '@/types/common'; // Import the Waypoint type

// Helper function to get the marker label (A-H, 1-8) based on index
const getMarkerLabel = (index: number): string => {
  const clampedIndex = Math.min(index, 15); // Max 16 markers (0-15)
  if (clampedIndex < 8) {
    // A-H for indices 0-7
    return String.fromCharCode(65 + clampedIndex); // 65 is ASCII for 'A'
  } else {
    // 1-8 for indices 8-15
    return (clampedIndex - 8 + 1).toString(); 
  }
};

export default function WaypointList({
  waypoints,
  hoveredId,
  setHoveredId,
  // Add onWaypointClick to the destructuring
  onWaypointClick, 
}: {
  waypoints: Waypoint[];
  hoveredId: string | null;
  setHoveredId: (id: string | null) => void;
  // Add the new click handler prop
  onWaypointClick: (index: number) => void; 
}) {
  return (
    <ul className="space-y-2">
      {waypoints.map((wp, index) => ( // Add index here
        <li
          key={wp.id ?? `waypoint-${index}`} // Use index as fallback key
          className={`cursor-pointer p-3 rounded-lg border ${
            hoveredId === wp.id
              ? 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900 dark:border-blue-700 dark:text-blue-200' // Adjusted hover/active for dark
              : 'bg-white border-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:border-gray-600 dark:hover:bg-gray-700' // Added dark mode styles for default state
          }`}
          onMouseEnter={() => setHoveredId(wp.id ?? null)}
          onMouseLeave={() => setHoveredId(null)}
          onClick={() => onWaypointClick(index)} // Call the passed-in handler
        >
          <div className="flex items-center"> {/* Flex container for label and name */}
            <span className="mr-2 font-bold text-blue-600 dark:text-blue-400 w-4 text-center"> {/* Styled label - Added dark mode */}
              {getMarkerLabel(index)}
            </span>
            <span className="font-medium flex-1 text-gray-900 dark:text-gray-100">{wp.name}</span> {/* Waypoint name - Added dark mode */}
          </div>
          {wp.description && ( // Conditionally render description if it exists
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-6">{wp.description}</div> // Indent description - Added dark mode
          )}
        </li>
      ))}
    </ul>
  );
}
