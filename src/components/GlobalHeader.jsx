import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { executeLogout } from './authLogout';
import { supabase } from '../lib/supabase';

export default function GlobalHeader() {
  const { schoolSlug } = useParams(); // Grabs the slug straight from the URL path
  const navigate = useNavigate();
  const [schoolLogo, setSchoolLogo] = useState('');
  
  // Language Selector State (persists across pages using localStorage)
  const [selectedLang, setSelectedLang] = useState(() => {
    return localStorage.getItem('seedora_lang') || 'en';
  });

  // Fetch school logo based on the current school slug from the database
  useEffect(() => {
    async function fetchSchoolLogo() {
      if (!schoolSlug) return;
      try {
        const { data, error } = await supabase
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

  // Handle language change (updates localStorage and syncs with Supabase profile)
  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    setSelectedLang(newLang);
    localStorage.setItem('seedora_lang', newLang);
    
    // Save preference to Supabase if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ preferred_language: newLang })
          .eq('id', user.id);
      }
    } catch (err) {
      console.error('Error saving language preference to database:', err.message);
    }
    
    // Trigger window event so active panels can update immediately
    window.dispatchEvent(new Event('languageChange'));
  };

  const handleLogout = async () => {
    await executeLogout(navigate);
  };

  return (
    <header className="w-full bg-[#0b0f19] border-b border-gray-800/60 px-6 py-4 flex items-center justify-between text-white">
      {/* Left Section: Dynamic Logo, School Slug & Sports Link */}
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

      {/* Right Section: Top 15 Language Selector & Log Out Button */}
      <div className="flex items-center space-x-4">
        {/* Top 15 Global Languages Dropdown */}
        <select
          value={selectedLang}
          onChange={handleLanguageChange}
          aria-label="Select language"
          className="bg-gray-900 border border-gray-700 text-xs font-medium rounded-lg px-3 py-2 text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
        >
          <option value="en">English</option>
          <option value="zh">中文 (Mandarin Chinese)</option>
          <option value="hi">हिन्दी (Hindi)</option>
          <option value="es">Español (Spanish)</option>
          <option value="fr">Français (French)</option>
          <option value="ar">العربية (Arabic)</option>
          <option value="bn">বাংলা (Bengali)</option>
          <option value="pt">Português (Portuguese)</option>
          <option value="ru">Русский (Russian)</option>
          <option value="ur">اردو (Urdu)</option>
          <option value="id">Bahasa Indonesia (Indonesian)</option>
          <option value="de">Deutsch (German)</option>
          <option value="ja">日本語 (Japanese)</option>
          <option value="pa">ਪੰਜਾਬੀ (Punjabi)</option>
          <option value="jv">Basa Jawa (Javanese)</option>
        </select>

        {/* Log Out Button */}
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