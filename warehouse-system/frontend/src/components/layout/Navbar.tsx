/**
 * FILE: src/components/layout/Navbar.tsx
 * PURPOSE: Top navigation bar với search, notifications, user profile.
 */

'use client';

import { Bell, Moon, Search, Sun, User } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { Button } from '@/components/ui/Button';

interface NavbarProps {
  title?: string;
}

export function Navbar({ title = 'Dashboard' }: NavbarProps) {
  const { isDarkMode, toggleDarkMode } = useUIStore();

  return (
    <header
      className="flex h-14 items-center justify-between border-b border-gray-200 bg-white px-6"
      data-testid="top-navbar"
    >
      {/* Page Title */}
      <h1
        className="text-base font-semibold text-gray-900"
        data-testid="page-title"
      >
        {title}
      </h1>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="search"
            placeholder="Search..."
            data-testid="input-global-search"
            className="h-9 w-64 rounded-md border border-gray-300 bg-gray-50 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Dark mode toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          data-testid="btn-toggle-dark-mode"
          title="Toggle dark mode"
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4 text-gray-600" />
          ) : (
            <Moon className="h-4 w-4 text-gray-600" />
          )}
        </Button>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          data-testid="btn-notifications"
          title="Notifications"
          className="relative"
        >
          <Bell className="h-4 w-4 text-gray-600" />
          {/* Badge dot */}
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
        </Button>

        {/* User profile */}
        <button
          data-testid="btn-user-profile"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-200">
            <User className="h-4 w-4 text-gray-600" />
          </div>
          <span className="hidden sm:block font-medium">Admin</span>
        </button>
      </div>
    </header>
  );
}
