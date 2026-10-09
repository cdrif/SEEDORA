import { useState, useEffect } from 'react';

export default function CookieBanner() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if the user has already consented
    const hasConsented = localStorage.getItem('seedora_cookie_consent');
    if (!hasConsented) {
      setShowBanner(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('seedora_cookie_consent', 'true');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#111827] border-t border-gray-800 text-white shadow-2xl">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-xs sm:text-sm text-gray-300 text-center sm:text-left leading-relaxed">
          We use cookies and local storage to optimize your experience, manage sessions, and analyze site traffic. By continuing to use our site, you agree to our{' '}
          <a 
            href="https://www.seedoraservices.com/privacy&terms" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-indigo-400 hover:underline font-medium"
          >
            Privacy Policy & Terms
          </a>.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={handleAccept}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium rounded-lg transition-colors cursor-pointer"
          >
            Accept & Close
          </button>
        </div>
      </div>
    </div>
  );
}