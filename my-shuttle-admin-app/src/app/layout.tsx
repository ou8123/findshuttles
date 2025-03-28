import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shuttle Finder",
  description: "Find shuttle routes worldwide",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}