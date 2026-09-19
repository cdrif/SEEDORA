import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LogoutPage() {
  const navigate = useNavigate();
  const [tagline, setTagline] = useState('Catch you later!');

  useEffect(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const hour = now.getHours();

    // End of week check (Friday after 5 PM, all day Saturday or Sunday)
    const isEndOfWeek = (dayOfWeek === 5 && hour >= 17) || dayOfWeek === 6 || dayOfWeek === 0;

    if (isEndOfWeek) {
      setTagline('Have a great weekend!');
    } else if (hour >= 19) {
      setTagline('Goodnight!');
    } else if (hour < 12) {
      setTagline('Have a wonderful rest of your day!');
    } else {
      setTagline('Catch you later!');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-xl text-center space-y-6">
        
        {/* Brand Header */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-white">SEEDORA</h1>
          <p className="text-sm font-medium text-indigo-400">{tagline}</p>
        </div>

        {/* Logo Display */}
        <div className="flex justify-center my-2">
          <img 
            src="/seedoralogo.png" 
            alt="Seedora Logo" 
            className="w-20 h-20 object-contain drop-shadow-md"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        </div>

        <p className="text-xs text-gray-400 leading-relaxed">
          You have been securely signed out of your session.
        </p>

        {/* Action Button */}
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer shadow-lg shadow-indigo-600/20"
        >
          Sign In Again
        </button>

      </div>
    </div>
  );
}