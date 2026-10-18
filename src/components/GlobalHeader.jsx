import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { executeLogout } from './authLogout';
import { supabase } from '../lib/supabase';
import LanguageSelector from './LanguageSelector';[cite: 6]

export default function GlobalHeader() {
  const { schoolSlug } = useParams();
  const navigate = useNavigate();
  const [schoolLogo, setSchoolLogo] = useState('');
  
  const [studentName] = useState('ALEXANDER J. THOMPSON');
  const [gradeLevel] = useState('GRADE 11');
  const [teacherName] = useState('Ms. Evelyn Davis');

  useEffect(() => {
    async function fetchSchoolLogo() {
      if (!schoolSlug) return;
      try {
        const { data } = await supabase
          .from('school_settings')
          .select('logo_url')
          .eq('school_slug', schoolSlug)
          .single();
        
        if (data && data.logo_url) {
          setSchoolLogo(data.logo_url);
        }
      } catch (err) {
        console.error('Error loading school logo in header:', err.message);
      }
    }
    fetchSchoolLogo();
  }, [schoolSlug]);

  const handleLogout = async () => {
    await executeLogout(navigate);
  };

  return (
    <header className="w-full bg-[#0b0f19] border-b border-gray-800/60 px-6 py-4 flex items-center justify-between text-white">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full border border-gray-600 flex items-center justify-center bg-gray-900 shadow-inner overflow-hidden flex-shrink-0">
            {schoolLogo ? (
              <img src={schoolLogo} alt="School Logo" className="w-full h-full object-cover" />
            ) : (
              <svg className="w-5 h-5 text-gray-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" />
              </svg>
            )}
          </div>
          <span className="text-sm font-semibold tracking-wider text-gray-300 uppercase">
            {schoolSlug || 'school'}
          </span>
        </div>

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

      <div className="flex items-center space-x-6">
        <div className="flex flex-col items-start text-left border-l border-gray-800 pl-6">
          <span className="text-sm font-bold tracking-wider text-white uppercase">
            {studentName}
          </span>
          <div className="flex items-center space-x-2 text-xs text-gray-400 mt-0.5">
            <span>{gradeLevel}</span>
            <span>•</span>
            <span>Teacher: {teacherName}</span>
          </div>
        </div>

        {/* Clean Component-Managed Language Selector */}
        <LanguageSelector />[cite: 6]

        <button
          onClick={handleLogout}
          className="px-4 py-1.5 text-sm font-medium text-gray-200 bg-transparent border border-gray-700 rounded-lg hover:bg-gray-800 hover:text-white transition-colors cursor-pointer"
        >
          Log Out
        </button>
      </div>
    </header>
  );
}