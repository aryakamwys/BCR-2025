import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  showAdminButton?: boolean;
}

export default function Navbar({ showAdminButton = false }: NavbarProps) {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isLeaderboard = location.pathname === '/leaderboard';
  const isEvents = location.pathname === '/event';

  const navLinks = [
    { to: '/leaderboard', label: 'Leaderboard', isActive: isLeaderboard },
    { to: '/event', label: 'Events', isActive: isEvents },
  ];

  return (
    <nav className="bg-white border-b-2 border-red-500 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14 md:h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/Assets/logo2.gif" alt="Logo" className="h-10 sm:h-12 md:h-16 lg:h-20 w-auto object-contain" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3 lg:gap-4">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm lg:text-base font-semibold transition-colors relative py-1 ${
                  link.isActive ? 'text-accent' : 'text-gray-900 hover:text-accent'
                }`}
              >
                {link.label}
                {link.isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
                )}
              </Link>
            ))}

            {showAdminButton && (
              <Link
                to="/admin/overview"
                className="px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm font-semibold bg-accent text-white rounded-lg hover:bg-red-600 hover:-translate-y-0.5 transition-all shadow-sm"
              >
                Admin
              </Link>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 sm:p-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-60 pb-4' : 'max-h-0'
          }`}
        >
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                onClick={() => setMobileMenuOpen(false)}
                className={`px-4 py-3 rounded-lg text-base font-semibold transition-colors ${
                  link.isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {showAdminButton && (
              <Link
                to="/admin/overview"
                onClick={() => setMobileMenuOpen(false)}
                className="mx-4 mt-2 px-4 py-3 text-center text-base font-semibold bg-accent text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
