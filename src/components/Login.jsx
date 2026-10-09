import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedSchoolSlug, setSelectedSchoolSlug] = useState('default-school');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const availableSchools = [
    { id: 'default-school-id', name: 'Default Academy', slug: 'default-school' },
    { id: 'seedora-high-id', name: 'Seedora Central High', slug: 'seedora-high' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!agreedToPrivacy) {
      alert('You must agree to the Privacy Policy & Terms to continue.');
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

        const chosenSchool = availableSchools.find((s) => s.slug === selectedSchoolSlug) || availableSchools[0];
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

        window.location.replace(`/${chosenSchool.slug}/${role}`);

      } else {
        const signInCall = supabase.auth.signInWithPassword({
          email,
          password,
        });

        const { data: authData, error: authError } = await Promise.race([signInCall, timeoutPromise]);
        console.log("Raw auth response:", { authData, authError });
        if (authError) throw authError;

        const userId = authData.user.id;

        const adminResult = await supabase.from('platform_admins').select('*').eq('user_id', userId).maybeSingle();
        console.log("Platform admin query result:", adminResult);

        if (adminResult.data) {
          console.log('User is a platform admin! Navigating to superadmin dashboard...');
          window.location.replace('/superadmin');
          return;
        }

        const memberResult = await supabase.from('school_members').select('role, schools(slug)').eq('user_id', userId).maybeSingle();

        const member = memberResult.data;
        const memberError = memberResult.error;

        if (memberError || !member) {
          throw new Error('No school profile found for this user and you are not a platform admin.');
        }

        const schoolData = Array.isArray(member.schools) ? member.schools[0] : member.schools;
        const slug = schoolData?.slug || 'default-school';
        const userRole = member.role;

        window.location.replace(`/${slug}/${userRole}`);
      }

    } catch (err) {
      console.error('Caught error in login:', err);
      alert(err.message);
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white px-4">
      <form onSubmit={handleSubmit} className="bg-[#111827] border border-gray-800 p-8 rounded-xl w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold">{isSignUp ? 'Create Parent Account' : 'Sign In'}</h2>
        
        {isSignUp && (
          <div>
            <label className="text-sm text-gray-400">Full Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              placeholder="John Doe"
              required
            />
          </div>
        )}

        <div>
          <label className="text-sm text-gray-400">Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
            placeholder="••••••••"
            required
          />
        </div>

        {isSignUp && (
          <div>
            <label className="text-sm text-gray-400">Select School</label>
            <select
              value={selectedSchoolSlug}
              onChange={(e) => setSelectedSchoolSlug(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
            >
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
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors text-sm cursor-pointer"
        >
          {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Login')}
        </button>

        <div className="flex items-start space-x-2 pt-2 border-t border-gray-800">
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
            <a 
              href="https://www.seedoraservices.com/privacy&terms" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-indigo-400 hover:underline"
            >
              Privacy Policy & Terms
            </a>
            {' '}regarding data collection and handling.
          </label>
        </div>

        <div className="text-center pt-1">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-indigo-400 hover:underline cursor-pointer"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have a parent account? Sign Up"}
          </button>
        </div>
      </form>
    </div>
  );
}