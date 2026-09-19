import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false); // Toggle between Login and Signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Fetch schools on load so they are available if the user chooses to sign up
  useEffect(() => {
    async function fetchSchools() {
      const { data, error } = await supabase.from('schools').select('id, name, slug');
      if (!error && data) {
        setSchools(data);
      }
    }
    fetchSchools();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        // --- SIGN UP FLOW (Strictly Parents) ---
        if (!selectedSchoolId) {
          throw new Error('Please select a school.');
        }

        // 1. Create user in Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName } }
        });

        if (authError) throw authError;
        const userId = authData.user?.id;
        if (!userId) throw new Error('User registration failed.');

        // Find chosen school slug
        const chosenSchool = schools.find((s) => s.id === selectedSchoolId);
        if (!chosenSchool) throw new Error('Selected school not found.');

        // 2. Force role to 'parent' for all public signups for security compliance
        const role = 'parent';

        // 3. Insert into school_members table
        const { error: memberError } = await supabase
          .from('school_members')
          .insert([{ user_id: userId, school_id: selectedSchoolId, role }]);

        if (memberError) throw memberError;

        // 4. Redirect to parent portal
        navigate(`/${chosenSchool.slug}/${role}`);

      } else {
        // --- LOGIN FLOW ---
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (authError) throw authError;
        const userId = authData.user.id;

        // Fetch user's school slug and role
        const { data: member, error: memberError } = await supabase
          .from('school_members')
          .select('role, schools(slug)')
          .eq('user_id', userId)
          .single();

        if (memberError || !member) {
          throw new Error('No school profile found for this user.');
        }

        // Handle relation safely (whether object or array)
        const schoolData = Array.isArray(member.schools) ? member.schools[0] : member.schools;
        const slug = schoolData?.slug || 'default-school';
        const userRole = member.role;

        navigate(`/${slug}/${userRole}`);
      }

    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
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
              value={selectedSchoolId}
              onChange={(e) => setSelectedSchoolId(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm"
              required
            >
              <option value="" disabled>Choose your school...</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors text-sm"
        >
          {loading ? 'Please wait...' : (isSignUp ? 'Sign Up' : 'Login')}
        </button>

        <div className="text-center pt-2">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-indigo-400 hover:underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have a parent account? Sign Up"}
          </button>
        </div>
      </form>
    </div>
  );
}