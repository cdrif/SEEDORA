import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import GlobalHeader from './GlobalHeader';

export default function AdminEvents() {
  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [settingsId, setSettingsId] = useState(null);
  const [payments, setPayments] = useState([]);
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);

  // Banking config states
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bsb, setBsb] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [instructions, setInstructions] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    async function initAdminEvents() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');

        const { data: memberData } = await supabase
          .from('school_members')
          .select('school_slug')
          .eq('user_id', user.id)
          .single();

        const currentSlug = memberData?.school_slug || 'default-school';
        setSchoolSlug(currentSlug);

        // Fetch settings, events, payments, students
        const [setRes, evRes, payRes, stRes] = await Promise.all([
          supabase.from('school_settings').select('*').eq('school_slug', currentSlug).maybeSingle(),
          supabase.from('school_events').select('*').eq('school_slug', currentSlug),
          supabase.from('event_payments').select('*').eq('school_slug', currentSlug),
          supabase.from('students').select('*').eq('school_slug', currentSlug)
        ]);

        if (setRes.data) {
          setSettingsId(setRes.data.id);
          setBankName(setRes.data.bank_name || '');
          setAccountName(setRes.data.account_name || '');
          setBsb(setRes.data.bsb || '');
          setAccountNumber(setRes.data.account_number || '');
          setInstructions(setRes.data.payment_instructions || '');
        }

        setEvents(evRes.data || []);
        setPayments(payRes.data || []);
        setStudents(stRes.data || []);
      } catch (err) {
        console.error('Error loading admin events:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initAdminEvents();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const payload = {
        school_slug: schoolSlug,
        bank_name: bankName,
        account_name: accountName,
        bsb,
        account_number: accountNumber,
        payment_instructions: instructions,
        updated_at: new Date().toISOString()
      };

      if (settingsId) {
        const { error } = await supabase.from('school_settings').update(payload).eq('id', settingsId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('school_settings').insert([payload]).select().single();
        if (error) throw error;
        setSettingsId(data.id);
      }

      alert('School banking details updated successfully across all portals.');
    } catch (err) {
      alert('Error updating banking settings: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdatePaymentStatus = async (paymentId, status) => {
    try {
      const { error } = await supabase
        .from('event_payments')
        .update({ status })
        .eq('id', paymentId);

      if (error) throw error;
      setPayments(payments.map(p => p.id === paymentId ? { ...p, status } : p));
    } catch (err) {
      alert('Error updating payment status: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Admin Event & Banking Configuration</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage official school banking account details and verify parent event payments.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading admin portal...</div>
        ) : (
          <div className="space-y-10">
            {/* Banking Details Form */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-100 mb-1">School Bank Account Details</h2>
              <p className="text-sm text-gray-400 mb-4">Displayed on parent portals for excursion and event transfers.</p>

              <form onSubmit={handleSaveSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Bank Name:</label>
                    <input 
                      type="text" 
                      value={bankName} 
                      onChange={e => setBankName(e.target.value)}
                      placeholder="e.g., Commonwealth Bank"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Account Name:</label>
                    <input 
                      type="text" 
                      value={accountName} 
                      onChange={e => setAccountName(e.target.value)}
                      placeholder="e.g., School Excursion Fund"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">BSB:</label>
                    <input 
                      type="text" 
                      value={bsb} 
                      onChange={e => setBsb(e.target.value)}
                      placeholder="000-000"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Account Number:</label>
                    <input 
                      type="text" 
                      value={accountNumber} 
                      onChange={e => setAccountNumber(e.target.value)}
                      placeholder="12345678"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Transfer Instructions / Reference Format:</label>
                  <textarea 
                    value={instructions} 
                    onChange={e => setInstructions(e.target.value)}
                    placeholder="Include student full name and grade as reference..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-white h-20 resize-none"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={savingSettings}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm cursor-pointer transition-colors"
                >
                  {savingSettings ? 'Saving Details...' : 'Save Banking Configuration'}
                </button>
              </form>
            </div>

            {/* Payment Verification Queue */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-base font-semibold text-gray-100">Parent Payment Verification Queue</h3>
                <p className="text-xs text-gray-400 mt-0.5">Verify incoming bank transfers submitted by parents.</p>
              </div>

              {payments.length === 0 ? (
                <div className="p-6 text-gray-400 text-sm">No payment submissions found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/50 font-mono text-xs">
                        <th className="py-3 px-6">Event</th>
                        <th className="py-3 px-6">Student</th>
                        <th className="py-3 px-6">Reference Used</th>
                        <th className="py-3 px-6">Status</th>
                        <th className="py-3 px-6 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                      {payments.map(pay => {
                        const ev = events.find(e => e.id === pay.event_id);
                        const st = students.find(s => s.id === pay.student_id);
                        return (
                          <tr key={pay.id} className="hover:bg-gray-900/30 transition-colors">
                            <td className="py-3 px-6 text-white font-sans">{ev ? ev.title : 'Event'}</td>
                            <td className="py-3 px-6 text-gray-300 font-sans">{st ? `${st.first_name} ${st.last_name}` : 'Student'}</td>
                            <td className="py-3 px-6 text-gray-300">{pay.reference_text || 'None'}</td>
                            <td className="py-3 px-6">
                              <span className={`px-2.5 py-1 rounded text-[10px] uppercase font-bold ${
                                pay.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                                pay.status === 'rejected' ? 'bg-red-950 text-red-400 border border-red-800' :
                                'bg-blue-950 text-blue-400 border border-blue-800'
                              }`}>
                                {pay.status}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-right space-x-2">
                              {pay.status !== 'approved' && (
                                <button 
                                  onClick={() => handleUpdatePaymentStatus(pay.id, 'approved')}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded cursor-pointer"
                                >
                                  Approve
                                </button>
                              )}
                              {pay.status !== 'rejected' && (
                                <button 
                                  onClick={() => handleUpdatePaymentStatus(pay.id, 'rejected')}
                                  className="bg-red-600 hover:bg-red-700 text-white px-2.5 py-1 rounded cursor-pointer"
                                >
                                  Reject
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}