import { FC } from "react";
import { 
  CheckCircleIcon, 
  UserIcon, 
  HomeIcon, 
  SparklesIcon, // Used for A/C (Sun)
  WifiIcon, 
  LockClosedIcon, // For Private Shuttle/Secure
  MapPinIcon, 
  ClockIcon, 
  CalendarDaysIcon,
  InformationCircleIcon, // Generic info/details
  // Add other relevant Heroicons as needed
  QuestionMarkCircleIcon // Default fallback
} from "@heroicons/react/24/solid";

// Define a mapping from iconName strings to Heroicon components
// Add more mappings as you identify common amenities and their icons
const ICONS: Record<string, React.ElementType> = {
  users: UserIcon,          // Example: "Private Group"
  home: HomeIcon,           // Example: "Hotel Pickup"
  wifi: WifiIcon,           // Example: "WiFi Available"
  ac: SparklesIcon,         // Example: "Air Conditioning"
  private: LockClosedIcon,  // Example: "Private Shuttle"
  location: MapPinIcon,     // Example: "Specific Stop"
  time: ClockIcon,          // Example: "Flexible Schedule"
  calendar: CalendarDaysIcon, // Example: "Daily Departures"
  info: InformationCircleIcon, // Example: "Details Provided"
  // Add more specific icons here
  // 'baby': BabyIcon, // Requires @heroicons/react/outline or custom
  // 'water': GlassWaterIcon, // Requires @heroicons/react/outline or custom
};

// Define the props for the AmenityBadge component
interface AmenityBadgeProps {
  name: string;
  iconName?: string | null; // Make iconName optional and allow null
}

export const AmenityBadge: FC<AmenityBadgeProps> = ({ name, iconName }) => {
  // Determine which icon component to use
  const IconComponent = (iconName && ICONS[iconName]) ? ICONS[iconName] : CheckCircleIcon; // Fallback to CheckCircleIcon

  return (
    <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 mb-1"> {/* Added mb-1 for spacing */}
      <IconComponent className="h-4 w-4 text-green-600 mr-2 flex-shrink-0" aria-hidden="true" />
      <span className="truncate">{name}</span>
    </div>
  );
};

export default AmenityBadge;
