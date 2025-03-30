import Link from 'next/link';

const Header = () => {
  return (
    <header className="bg-gray-800 text-white p-4 shadow-md">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-gray-300">
          Shuttle Finder
        </Link>
        {/* No visible login or admin links for better security */}
      </nav>
    </header>
  );
};

export default Header;
