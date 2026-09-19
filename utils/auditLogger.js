import { supabase } from '../supabase';

export async function logComplianceAccess(actionDescription, details = '') {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('compliance_audit_logs').insert([
      {
        user_id: user.id,
        action: actionDescription,
        details: details,
      }
    ]);
  } catch (err) {
    // Fail silently in the background so it doesn't break the user experience
    console.error('Audit logging failed:', err.message);
  }
}