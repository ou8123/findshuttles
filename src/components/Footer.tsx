const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="bg-gray-100 text-gray-600 p-4 mt-8 border-t">
      <div className="container mx-auto text-center text-sm">
        &copy; {currentYear} Shuttle Finder. All rights reserved.
        {/* Add other footer links or info here if needed */}
      </div>
    </footer>
  );
};

export default Footer;