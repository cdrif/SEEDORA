import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false); // Manages the success screen display
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // Mandatory school dropdown state (starts empty to enforce a selection)
  const [selectedSchoolSlug, setSelectedSchoolSlug] = useState(''); 
  
  // Compliance tracking states
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [agreedToCookies, setAgreedToCookies] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  // List of registered schools available across your platform
  const availableSchools = [
    { id: 'default-school-id', name: 'Default Academy', slug: 'default-school' },
    { id: 'seedora-high-id', name: 'Seedora Central High', slug: 'seedora-high' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 1. Mandatory School Field Check
    if (isSignUp && !selectedSchoolSlug) {
      alert('Please select a school from the dropdown list. This field is mandatory.');
      return;
    }
    
    // 2. Comprehensive Compliance Check
    if (!agreedToPrivacy || !agreedToCookies) {
      alert('You must explicitly agree to the Privacy Policy, Terms, and Cookie Policy to proceed.');
      return;
    }

    if (isMounted.current) setLoading(true);

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Connection timed out. Please check your network or Supabase status.')), 6000)
    );

    try {
      if (isSignUp) {
        const signUpCall = supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });

        const { data: authData, error: authError } = await Promise.race([signUpCall, timeoutPromise]);
        if (authError) throw authError;

        const userId = authData.user?.id;
        if (!userId) throw new Error('User registration failed.');

        const chosenSchool = availableSchools.find((s) => s.slug === selectedSchoolSlug);
        const role = 'parent';

        try {
          await supabase
            .from('school_members')
            .insert([{ 
              user_id: userId, 
              school_id: chosenSchool.id, 
              role,
              privacy_accepted_at: new Date().toISOString() 
            }]);
        } catch (memberErr) {
          console.warn('Member profile insert skipped/deferred:', memberErr);
        }

        // 3. Trigger the visual success state instead of an immediate page jump
        if (isMounted.current) {
          setLoading(false);
          setShowSuccess(true);
        }

        // Wait briefly so they can read the success message before landing in their portal
        setTimeout(() => {
          window.location.replace(`/${chosenSchool.slug}/${role}`);
        }, 2205);

      } else {
        const signInCall = supabase.auth.signInWithPassword({
          email,
          password,
        });

        const { data: authData, error: authError } = await Promise.race([signInCall, timeoutPromise]);
        if (authError) throw authError;

        const userId = authData.user.id;
        console.log("Logged in user ID:", userId);

        const adminResult = await supabase.from('platform_admins').select('*').eq('user_id', userId).maybeSingle();
        if (adminResult.data) {
          window.location.replace('/superadmin');
          return;
        }

        const { data: memberData } = await supabase
          .from('school_members')
          .select('school_slug, role')
          .eq('user_id', userId)
          .maybeSingle();

        if (memberData && memberData.school_slug) {
          let targetRole = memberData.role || 'admin';
          if (targetRole === 'admin_principal') targetRole = 'admin';
          
          window.location.replace(`/${memberData.school_slug}/${targetRole}`);
          return;
        }

        window.location.replace('/default-school/admin');
        return;
      }

    } catch (err) {
      console.error('Caught error in login:', err);
      alert(err.message);
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 min-h-screen bg-black/60 backdrop-blur-sm flex items-center justify-center text-white px-4 transition-all duration-300">
      <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl w-full max-w-md relative shadow-2xl transition-all duration-300">
        
        {showSuccess ? (
          /* Success Screen Reveal Render */
          <div className="flex flex-col items-center justify-center py-10 space-y-4 text-center">
            <div className="h-14 w-14 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center border border-green-500/30 text-2xl font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Account Created!</h3>
              <p className="text-sm text-gray-400 mt-1">
                Setting up your parent profile and loading your dashboard layout...
              </p>
            </div>
          </div>
        ) : (
          /* Main Interactive Sign In / Sign Up Form Interface */
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="text-xl font-bold text-center sm:text-left">
              {isSignUp ? 'Create Parent Account' : 'Sign In'}
            </h2>
            
            {isSignUp && (
              <div>
                <label className="text-sm text-gray-400">Full Name *</label>
                <input 
                  type="text" 
                  value={fullName} 
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            <div>
              <label className="text-sm text-gray-400">Email Address *</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="text-sm text-gray-400">Password *</label>
              <input 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)}
                className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="••••••••"
                required
              />
            </div>

            {isSignUp && (
              <div>
                <label className="text-sm text-gray-400">
                  Select Registered School * <span className="text-xs text-red-400">(Mandatory)</span>
                </label>
                <select
                  value={selectedSchoolSlug}
                  onChange={(e) => setSelectedSchoolSlug(e.target.value)}
                  className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none cursor-pointer"
                  required
                >
                  <option value="" disabled hidden>-- Select your school --</option>
                  {availableSchools.map((school) => (
                    <option key={school.id} value={school.slug}>
                      {school.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed rounded-lg font-medium transition-colors text-sm cursor-pointer pt-2"
            >
              {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Login')}
            </button>

            {/* Compliance Checkboxes Layout */}
            <div className="pt-3 border-t border-gray-800 space-y-3">
              <div className="flex items-start space-x-2">
                <input 
                  type="checkbox" 
                  id="privacy-consent"
                  checked={agreedToPrivacy}
                  onChange={(e) => setAgreedToPrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  required
                />
                <label htmlFor="privacy-consent" className="text-xs text-gray-400 leading-relaxed">
                  I agree to the{' '}
                  <a href="https://www.seedoraservices.com/privacy&terms" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    Privacy Policy & Terms
                  </a>.
                </label>
              </div>

              <div className="flex items-start space-x-2">
                <input 
                  type="checkbox" 
                  id="cookie-consent"
                  checked={agreedToCookies}
                  onChange={(e) => setAgreedToCookies(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-700 bg-gray-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  required
                />
                <label htmlFor="cookie-consent" className="text-xs text-gray-400 leading-relaxed">
                  I agree to data tracking and handling according to the{' '}
                  <a href="https://www.seedoraservices.com/cookie-policy" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                    Cookie Policy
                  </a>.
                </label>
              </div>
            </div>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setSelectedSchoolSlug(''); // Reset selection when switching views
                }}
                className="text-xs text-indigo-400 hover:underline cursor-pointer"
              >
                {isSignUp ? 'Already have an account? Sign In' : "Don't have a parent account? Sign Up"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}