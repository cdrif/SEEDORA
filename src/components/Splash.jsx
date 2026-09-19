import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Splash() {
  const navigate = useNavigate();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // 4 seconds total duration, updating every 40ms for a smooth bar
    const duration = 4000;
    const intervalTime = 40;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          navigate('/login');
          return 100;
        }
        return prev + increment;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col justify-between items-center px-6 py-12 relative overflow-hidden">
      
      {/* Top action */}
      <div className="w-full max-w-6xl flex justify-end">
        <button
          onClick={() => navigate('/login')}
          className="text-xs font-mono text-gray-300 hover:text-white bg-gray-900 border border-gray-800 px-4 py-2 rounded-lg transition-colors cursor-pointer"
        >
          Skip
        </button>
      </div>

      {/* Center Animated Logo & Tagline */}
      <div className="flex flex-col items-center text-center space-y-6 my-auto w-full max-w-md">
        
        {/* Chroma Wave Logo Animation & Inline Styles (Box removed) */}
        <div className="relative group">
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-75 blur-md animate-pulse"></div>
          
          <div className="relative flex items-center justify-center p-2">
            <style>{`
              @keyframes chromaWave {
                0% { filter: hue-rotate(0deg) brightness(1); }
                50% { filter: hue-rotate(90deg) brightness(1.2); }
                100% { filter: hue-rotate(0deg) brightness(1); }
              }
              .animate-chroma {
                animation: chromaWave 6s infinite ease-in-out;
              }
            `}</style>
            <img 
              src="/seedoralogo.png" 
              alt="Seedora Logo" 
              className="w-24 h-24 object-contain animate-chroma" 
            />
          </div>
        </div>

        {/* Brand & Tagline */}
        <div className="space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-wider text-white">
            SEEDORA
          </h1>
          <p className="text-indigo-400 font-mono text-sm tracking-wide">
            Keeping Schools Connected!
          </p>
        </div>

        {/* Loading Progress Bar */}
        <div className="w-full space-y-2 pt-6">
          <div className="w-full bg-gray-900 border border-gray-800 h-2 rounded-full overflow-hidden p-[1px]">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full rounded-full transition-all duration-75"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="flex justify-between items-center text-xs font-mono text-gray-500">
            <span>Loading system...</span>
            <span>{Math.round(progress)}%</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-xs font-mono text-gray-600">
        &copy; {new Date().getFullYear()} Seedora. Secure Multi-Tenant Architecture.
      </div>
    </div>
  );
}