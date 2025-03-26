import Link from 'next/link';

const Header = () => {
  return (
    <header className="bg-gray-800 text-white p-4 shadow-md">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:text-gray-300">
          Shuttle Finder
        </Link>
        <div>
          {/* Placeholder for future links like Login/Admin */}
          <Link href="/api/auth/signin" className="mr-4 hover:text-gray-300">Sign In</Link>
          {/* <Link href="/admin" className="hover:text-gray-300">Admin</Link> */}
        </div>
      </nav>
    </header>
  );
};

export default Header;