import type { Metadata } from "next";
import { Inter } from "next/font/google"; // Use Inter font instead of Geist
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ErrorHandlerLoader from "@/components/ErrorHandlerLoader";

// Use Inter font
const inter = Inter({
  subsets: ["latin"],
  variable: '--font-inter', // Define CSS variable for Inter
});


export const metadata: Metadata = {
  title: {
    template: '%s | FindTours.com',
    default: 'Shuttle Finder | FindTours.com',
  },
  description: "Find shuttle routes worldwide",
};

export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
  };
}

// Define props interface - Keep this simple definition
interface RootLayoutProps {
  children: React.ReactNode;
}

// Rewrite the component definition cleanly
export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <head>
        {/* Debugging inline script removed */}
      </head>
      <body className="antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <ErrorHandlerLoader />
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
