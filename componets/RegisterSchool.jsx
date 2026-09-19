import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';

export default function RegisterSchool() {
  const [schoolName, setSchoolName] = useState('');
  const [schoolSlug, setSchoolSlug] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Auto-generate a URL-friendly slug when the school name is typed
  const handleSchoolNameChange = (e) => {
    const name = e.target.value;
    setSchoolName(name);
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-');
    setSchoolSlug(slug);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Create the user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } }
      });

      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('User account creation failed.');

      // 2. Insert the new school into the 'schools' table
      const { data: schoolData, error: schoolError } = await supabase
        .from('schools')
        .insert([{ name: schoolName, slug: schoolSlug }])
        .select('id, slug')
        .single();

      if (schoolError) throw schoolError;

      // 3. Insert into 'school_members' mapping user to school as 'admin'
      const { error: memberError } = await supabase
        .from('school_members')
        .insert([{ 
          user_id: userId, 
          school_id: schoolData.id, 
          role: 'admin' 
        }]);

      if (memberError) throw memberError;

      // 4. Redirect straight to their new admin dashboard
      navigate(`/${schoolData.slug}/admin`);

    } catch (err) {
      alert('Registration Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white px-4">
      <form onSubmit={handleRegister} className="bg-[#111827] border border-gray-800 p-8 rounded-xl w-full max-w-lg space-y-4">
        <div>
          <h2 className="text-xl font-bold">Register Your School</h2>
          <p className="text-xs text-gray-400 mt-1">Set up your institution and administrator account for Seedora.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm text-gray-400">School Name</label>
            <input 
              type="text" 
              value={schoolName} 
              onChange={handleSchoolNameChange}
              className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
              placeholder="Brisbane Grammar"
              required
            />
          </div>

          <div>
            <label className="text-sm text-gray-400">School Slug (URL)</label>
            <input 
              type="text" 
              value={schoolSlug} 
              onChange={(e) => setSchoolSlug(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-gray-400 text-sm font-mono focus:border-indigo-500 focus:outline-none"
              placeholder="brisbane-grammar"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-gray-400">Principal / Admin Full Name</label>
          <input 
            type="text" 
            value={fullName} 
            onChange={(e) => setFullName(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="Dr. Robert Smith"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Admin Email</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="principal@school.edu"
            required
          />
        </div>

        <div>
          <label className="text-sm text-gray-400">Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            className="w-full mt-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:border-indigo-500 focus:outline-none"
            placeholder="••••••••"
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium transition-colors text-sm mt-2 cursor-pointer"
        >
          {loading ? 'Provisioning School & Account...' : 'Create School Portal'}
        </button>

        <div className="text-center pt-2">
          <a href="/login" className="text-xs text-indigo-400 hover:underline">
            Already registered? Sign in instead
          </a>
        </div>
      </form>
    </div>
  );
}