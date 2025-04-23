const Footer = () => {
  const currentYear = new Date().getFullYear();
    return (
    <footer className="bg-gray-100 text-gray-600 p-4 mt-8 border-t">
      <div className="container mx-auto text-center text-sm space-x-4">
        <span>&copy; {currentYear} BookShuttles.com. All rights reserved.</span>
        <span className="border-l border-gray-300 pl-4">
          <a href="/suggest-route" className="hover:underline">Suggest a Route</a>
        </span>
        {/* Add other footer links or info here if needed */}
      </div>
    </footer>
  );
};

export default Footer;
