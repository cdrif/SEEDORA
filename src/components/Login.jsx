import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [availableSchools, setAvailableSchools] = useState([
    { id: 'default-school-id', name: 'Default Academy', slug: 'default-school' }
  ]);
  const [selectedSchoolSlug, setSelectedSchoolSlug] = useState('default-school');
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;

    async function fetchSchools() {
      try {
        const { data, error } = await supabase.from('schools').select('id, name, slug');
        if (!error && data && data.length > 0) {
          setAvailableSchools(data);
          setSelectedSchoolSlug(data[0].slug);
        }
      } catch (err) {
        console.error('Could not fetch schools list:', err);
      }
    }

    fetchSchools();

    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!agreedToPrivacy) {
      alert('You must agree to the Privacy Policy & Terms to continue.');
      return;
    }

    if (isMounted.current) setLoading(true);

    try {
      if (isSignUp) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });

        if (authError) throw authError;
        const userId = authData.user?.id;
        if (!userId) throw new Error('User registration failed.');

        const chosenSchool = availableSchools.find((s) => s.slug === selectedSchoolSlug) || availableSchools[0];
        
        await supabase
          .from('school_members')
          .insert([{ 
            user_id: userId, 
            school_id: chosenSchool.id,
            school_slug: chosenSchool.slug, 
            role: 'parent',
            privacy_accepted_at: new Date().toISOString() 
          }]);

        window.location.replace(`/${chosenSchool.slug}/parent`);

      } else {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        const userId = authData.user.id;

        const { data: adminRecord } = await supabase
          .from('platform_admins')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (adminRecord) {
          window.location.replace('/superadmin');
          return;
        }

        const { data: memberData, error: memberError } = await supabase
          .from('school_members')
          .select('school_slug, role')
          .eq('user_id', userId)
          .maybeSingle();

        if (!memberError && memberData && memberData.school_slug) {
          let targetRole = memberData.role || 'admin';
          if (targetRole === 'admin_principal') targetRole = 'admin';
          
          window.location.replace(`/${memberData.school_slug}/${targetRole}`);
          return;
        }

        throw new Error('Account role or school affiliation not found. Please contact your administrator.');
      }

    } catch (err) {
      console.error('Login error:', err);
      alert(err.message);
      if (isMounted.current) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white px-4">
      <form onSubmit={handleSubmit} className="bg-[#111827] border border-gray-800 p-8 rounded-xl w-full max-w-md space-y-4 shadow-xl">
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
            <label className="block text-sm text-gray-400 mb-1">
              Select Registered School * <span className="text-xs text-red-400">(Mandatory)</span>
            </label>
            <select
              value={selectedSchoolSlug}
              onChange={(e) => setSelectedSchoolSlug(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
            >
              {availableSchools.map((school) => (
                <option key={school.id || school.slug} value={school.slug}>
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