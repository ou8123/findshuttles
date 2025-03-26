import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider"; // Use @ alias
import Header from "@/components/Header"; // Import Header
import Footer from "@/components/Footer"; // Import Footer

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shuttle Finder", // Update title later
  description: "Find shuttle routes worldwide", // Update description later
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`} // Flex column, min height screen
      >
        <AuthProvider> {/* AuthProvider should wrap everything if session is needed globally */}
          <Header />
          <main className="flex-grow container mx-auto px-4 py-8"> {/* Main content area takes remaining space, centered with padding */}
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
