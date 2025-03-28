"use client"; // This component needs client-side hooks

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

interface NavItem {
  href: string;
  label: string;
}

interface AdminSidebarNavProps {
  navItems: NavItem[];
}

const AdminSidebarNav: React.FC<AdminSidebarNavProps> = ({ navItems }) => {
  const pathname = usePathname(); // Get the current path

  return (
    <nav className="flex-grow">
      <ul>
        {navItems.map((item) => {
          const isActive = pathname === item.href; // Check if the link is active
          return (
            <li key={item.href} className="mb-2">
              <Link
                href={item.href}
                className={`block py-2 px-3 rounded hover:bg-gray-700 transition-colors ${
                  isActive ? 'bg-gray-600 font-semibold' : '' // Apply active styles
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default AdminSidebarNav;