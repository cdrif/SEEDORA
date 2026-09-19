import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (using your project keys)
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL, 
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export default function ComplianceSignOff({ schoolId, staffId, actionType }) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Calls the secure Postgres function you created in Step 3
      const { data, error } = await supabase.rpc('verify_and_log_compliance', {
        p_school_id: schoolId,
        p_staff_id: staffId,
        p_pin_input: pin,
        p_action_type: actionType,
        p_details: { browser: navigator.userAgent }
      });

      if (error) throw error;

      alert('Success! Compliance action recorded in immutable audit logs.');
      setPin('');
    } catch (err) {
      alert(`Sign-off failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-slate-900 text-white rounded-lg">
      <h3>Head-Office Compliance Sign-Off</h3>
      <p>Enter your personal staff PIN to verify this action.</p>
      <input 
        type="password" 
        value={pin} 
        onChange={(e) => setPin(e.target.value)} 
        placeholder="Enter 4-digit PIN" 
        maxLength={6}
        required
        className="p-2 text-black rounded mr-2"
      />
      <button type="submit" disabled={loading} className="bg-blue-600 px-4 py-2 rounded">
        {loading ? 'Verifying...' : 'Sign Off'}
      </button>
    </form>
  );
}