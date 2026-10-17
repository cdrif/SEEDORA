import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { executeLogout } from './authLogout';
import { supabase } from '../lib/supabase';

export default function GlobalHeader() {
  const { schoolSlug } = useParams(); // Grabs the slug straight from the URL path
  const navigate = useNavigate();
  const [schoolLogo, setSchoolLogo] = useState('');
  
  // Student context states for the header display
  const [studentName, setStudentName] = useState('ALEXANDER J. THOMPSON');
  const [gradeLevel, setGradeLevel] = useState('GRADE 11');
  const [teacherName, setTeacherName] = useState('Ms. Evelyn Davis');
  
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

  // Initialize Google Translate automatic page-wide translator script
  useEffect(() => {
    if (!document.getElementById('google-translate-script')) {
      const script = document.createElement('script');
      script.id = 'google-translate-script';
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
      script.async = true;
      document.body.appendChild(script);

      window.googleTranslateElementInit = () => {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'ru,en,zh,es,fr,de,ja,ar,pt,id',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          },
          'google_translate_element'
        );
      };
    } else if (window.google && window.google.translate) {
      try {
        new window.google.translate.TranslateElement(
          {
            pageLanguage: 'en',
            includedLanguages: 'ru,en,zh,es,fr,de,ja,ar,pt,id',
            layout: window.google.translate.TranslateElement.InlineLayout.SIMPLE,
            autoDisplay: false
          },
          'google_translate_element'
        );
      } catch (e) {
        // Element may already be initialized
      }
    }
  }, []);

  // Handle language change (updates localStorage, syncs with Supabase profile, and triggers event)
  const handleLanguageChange = async (e) => {
    const newLang = e.target.value;
    setSelectedLang(newLang);
    localStorage.getItem('seedora_lang', newLang);
    
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
    
    window.dispatchEvent(new Event('languageChange'));
  };

  const handleLogout = async () => {
    await executeLogout(navigate);
  };

  return (
    <header className="w-full bg-[#0b0f19] border-b border-gray-800/60 px-6 py-4 flex items-center justify-between text-white">
      {/* Left Group: Logo, School Slug, and Tab Name (Sports Days) */}
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

      {/* Right-Side Group in Requested Order: Student Context -> Google Translate -> Log Out */}
      <div className="flex items-center space-x-6">
        {/* Student Name with Grade & Teacher underneath */}
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

        {/* Google Translate Target Container */}
        <div id="google_translate_element" className="text-xs"></div>

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