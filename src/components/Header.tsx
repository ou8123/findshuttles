import Link from 'next/link';
import Image from 'next/image';

const Header = () => {
  return (
    <header className="bg-white text-[#004d3b] px-2 pt-3 pb-0 shadow-md">
      <nav className="container mx-auto flex justify-between items-end px-1 pb-0">
        <Link href="/" className="flex items-end hover:opacity-90 transition-opacity -ml-1 mb-0">
          <img 
            src="/images/BookShuttles.com-Logo.png" 
            alt="Book Shuttles Logo" 
            style={{ 
              height: '60px', /* 20% larger height */
              width: 'auto',  /* Auto width to maintain aspect ratio */
              objectFit: 'contain',
              objectPosition: 'bottom', /* Align to bottom */
              marginRight: 'auto'
              // Removed marginBottom: '-1px'
            }}
          />
        </Link>
        {/* No visible login or admin links for better security */}
      </nav>
    </header>
  );
};

export default Header;
