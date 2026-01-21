import { Link, useLocation } from 'react-router-dom';

interface NavbarProps {
  showAdminButton?: boolean;
}

export default function Navbar({ showAdminButton = false }: NavbarProps) {
  const location = useLocation();

  const isLeaderboard = location.pathname === '/leaderboard';

  return (
    <nav className="bg-white border-b-2 border-red-500 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto pl-2 pr-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity pr-16">
            <img src="/Assets/logo2.gif" alt="Logo" className="h-32 w-auto object-contain" />
          </Link>

          {/* Right Section - Leaderboard, Events Link & Admin Button */}
          <div className="flex items-center gap-4">
            <Link
              to="/leaderboard"
              className={`text-sm font-semibold transition-colors relative ${
                isLeaderboard ? 'text-accent' : 'text-gray-900 hover:text-accent'
              }`}
            >
              Leaderboard
              {isLeaderboard && (
                <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-accent" />
              )}
            </Link>

            <Link
              to="/event"
              className={`text-sm font-semibold transition-colors relative ${
                location.pathname === '/event' ? 'text-accent' : 'text-gray-900 hover:text-accent'
              }`}
            >
              Events
              {location.pathname === '/event' && (
                <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-accent" />
              )}
            </Link>

            {showAdminButton && (
              <Link
                to="/admin/overview"
                className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-red-600 hover:-translate-y-0.5 transition-all shadow-sm"
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
