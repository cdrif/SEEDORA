import { useParams, useNavigate, Link } from 'react-router-dom';
import { executeLogout } from './authLogout';

export default function GlobalHeader() {
  const { schoolSlug } = useParams(); // Grabs the slug straight from the URL path!
  const navigate = useNavigate();

  const handleLogout = async () => {
    await executeLogout(navigate);
  };

  return (
    <header className="w-full bg-[#0b0f19] border-b border-gray-800/60 px-6 py-4 flex items-center justify-between text-white">
      {/* Left Section: Logo, School Slug & Sports Link */}
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center bg-gray-900 shadow-inner">
            <svg className="w-5 h-5 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              <path d="M2 12h20" />
            </svg>
          </div>
          
          {/* Dynamic School Slug from URL */}
          <span className="text-sm font-semibold tracking-wider text-gray-300 uppercase">
            {schoolSlug || 'school'}
          </span>
        </div>

        {/* Quick Link to Sports Pages */}
        {schoolSlug && (
          <nav className="flex items-center space-x-4 border-l border-gray-800 pl-6 text-sm">
            <Link 
              to={`/${schoolSlug}/admin/sports`} 
              className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
            >
              Sports Days
            </Link>
          </nav>
        )}
      </div>

      {/* Right Section: Log Out Button */}
      <button
        onClick={handleLogout}
        className="px-4 py-1.5 text-sm font-medium text-gray-200 bg-transparent border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
      >
        Log Out
      </button>
    </header>
  );
}