import { Link, useLocation } from 'react-router-dom';
import { useEvent } from '../contexts/EventContext';

interface NavbarProps {
  showAdminButton?: boolean;
  onAdminClick?: () => void;
}

export default function Navbar({ showAdminButton = false, onAdminClick }: NavbarProps) {
  const location = useLocation();
  const { currentEvent, events, setCurrentEvent } = useEvent();

  const isLeaderboard = location.pathname === '/';

  const handleEventChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = events.find((ev: any) => ev.id === e.target.value);
    if (selected) setCurrentEvent(selected);
  };

  return (
    <nav className="bg-white border-b-2 border-red-500 shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto pl-2 pr-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center hover:opacity-80 transition-opacity">
            <img src="/Assets/logo.jpeg" alt="Logo" className="h-14 w-auto object-contain" />
          </Link>

          {/* Center Section - Links & Event Selector */}
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className={`text-sm font-semibold transition-colors relative ${
                isLeaderboard ? 'text-accent' : 'text-gray-900 hover:text-accent'
              }`}
            >
              Leaderboard
              {isLeaderboard && (
                <span className="absolute bottom-[-4px] left-0 right-0 h-0.5 bg-accent" />
              )}
            </Link>

            {events.length > 0 && (
              <div className="flex items-center gap-2">
                <select
                  value={currentEvent?.id || ''}
                  onChange={handleEventChange}
                  className="px-3 py-1.5 text-sm font-semibold border border-gray-200 rounded-lg bg-white cursor-pointer hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
                >
                  {events.map((ev: any) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Right Section - Admin Button */}
          <div className="flex items-center gap-4">
            {showAdminButton && onAdminClick && (
              <button
                onClick={onAdminClick}
                className="px-4 py-2 text-sm font-semibold bg-accent text-white rounded-lg hover:bg-red-600 hover:-translate-y-0.5 transition-all shadow-sm"
              >
                Admin
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
