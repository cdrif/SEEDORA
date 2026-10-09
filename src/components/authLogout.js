import { supabase } from '../lib/supabase';

export async function executeLogout(navigate) {
  try {
    // 1. Terminate Supabase backend auth token
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // 2. Clear local storage tenant data
    localStorage.removeItem('seedora_active_school');

    // 3. Redirect to the logout view
    if (navigate) {
      navigate('/logout');
    } else {
      window.location.href = '/logout';
    }
  } catch (err) {
    console.error('Logout error:', err.message);
    // Fallback redirect even if clean session wipe throws an error
    if (navigate) navigate('/logout');
    else window.location.href = '/logout';
  }
}