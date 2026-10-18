import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Check if Supabase successfully established a session from the recovery/invite hash link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Listen for recovery event if session is loading asynchronously
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'PASSWORD_RECOVERY' || session) {
            // Session established
          }
        });
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please confirm your password.');
      return;
    }

    setLoading(true);

    try {
      // Updates the password for the authenticated invite/recovery user session
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      // Success! Show success panel
      setSuccess(true);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update password. Link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-white px-4 font-sans">
      <div className="bg-[#111827] border border-gray-800 p-8 rounded-xl w-full max-w-md shadow-2xl">
        
        {!success ? (
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            <div>
              <h2 className="text-xl font-bold">Set Your Password</h2>
              <p className="text-xs text-gray-400 mt-1">
                Please enter and confirm your new password to link your login credentials and access your dashboard.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg text-xs">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-400 mb-1">New Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-1">Confirm Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-lg cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating Credentials...' : 'Save Password & Continue'}
            </button>
          </form>
        ) : (
          /* SUCCESS PANEL */
          <div className="text-center space-y-4 py-4">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full flex items-center justify-center mx-auto text-xl">
              ✓
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Password Set Successfully!</h3>
              <p className="text-xs text-gray-400 mt-1">
                Your login has been successfully tied to your profile. You can now access your portal dashboard.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-lg cursor-pointer"
            >
              Proceed to Login / Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}