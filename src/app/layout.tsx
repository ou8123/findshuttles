import type { Metadata } from "next";
import Script from "next/script";
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
    template: '%s | BookShuttles.com', 
    default: 'BookShuttles.com', 
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
        {/* --- START ADDITION --- */}
        {/* Disable GA tracking if admin cookie is present */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (document.cookie.includes('ga-disable=true')) {
                window['ga-disable-G-97YPDY8L1Q'] = true;
              }
            `,
          }}
        />
        {/* --- END ADDITION --- */}

        {/* Google tag (gtag.js) */}
        <Script async src="https://www.googletagmanager.com/gtag/js?id=G-97YPDY8L1Q" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());

              gtag('config', 'G-97YPDY8L1Q');
            `,
          }}
        />
        {/* Debugging inline script removed */}
        <meta name="google-site-verification" content="ldADGVO7H18ffG-AUyaMvZHPttGJthBfhnYWKuj8gxA" />
        <script src="https://www.google.com/recaptcha/api.js" async defer></script>
      </head>
      <body className="antialiased flex flex-col min-h-screen"> {/* Removed dark: classes */}
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
