import { createClient } from '@supabase/supabase-js';

const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SUPABASE_ANON_KEY');

async function handleComplianceSignOff(schoolId, staffId, pinInput, actionType, details) {
  try {
    const { data, error } = await supabase.rpc('verify_and_log_compliance', {
      p_school_id: schoolId,
      p_staff_id: staffId,
      p_pin_input: pinInput,
      p_action_type: actionType,
      p_details: details
    });

    if (error) throw error;
    
    alert('Compliance action successfully signed off and logged.');
    return true;
  } catch (err) {
    console.error('Sign-off failed:', err.message);
    alert(`Error: ${err.message}`);
    return false;
  }
}