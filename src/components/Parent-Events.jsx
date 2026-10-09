import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import GlobalHeader from './GlobalHeader';

export default function ParentEvents() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState(null);
  const [payments, setPayments] = useState([]);

  // Payment form states
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [referenceText, setReferenceText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function initParentEvents() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');
        setUserId(user.id);

        const { data: memberData } = await supabase
          .from('school_members')
          .select('school_slug')
          .eq('user_id', user.id)
          .single();

        const currentSlug = memberData?.school_slug || 'default-school';
        setSchoolSlug(currentSlug);

        const [evRes, stRes, setRes, payRes] = await Promise.all([
          supabase.from('school_events').select('*').eq('school_slug', currentSlug).order('event_date', { ascending: true }),
          supabase.from('students').select('*').eq('school_slug', currentSlug),
          supabase.from('school_settings').select('*').eq('school_slug', currentSlug).maybeSingle(),
          supabase.from('event_payments').select('*').eq('parent_id', user.id)
        ]);

        setEvents(evRes.data || []);
        setStudents(stRes.data || []);
        setSettings(setRes.data || null);
        setPayments(payRes.data || []);
      } catch (err) {
        console.error('Error loading parent events:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initParentEvents();
  }, []);

  const handlePaymentSubmission = async (e) => {
    e.preventDefault();
    if (!selectedEvent || !selectedStudent || !referenceText) {
      alert('Please select an event, child, and enter your transfer reference.');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('event_payments').insert([{
        school_slug: schoolSlug,
        event_id: selectedEvent,
        student_id: selectedStudent,
        parent_id: userId,
        status: 'pending',
        reference_text: referenceText,
        submitted_at: new Date().toISOString()
      }]);

      if (error) throw error;

      alert('Payment notification submitted successfully! Status is now Pending admin verification.');
      setSelectedEvent('');
      setSelectedStudent('');
      setReferenceText('');
      window.location.reload();
    } catch (err) {
      alert('Error submitting payment: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">School Events & Fee Portal</h1>
          <p className="text-sm text-gray-400 mt-1">
            Browse upcoming school excursions, view school bank details for transfers, and submit payment verifications.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading events...</div>
        ) : (
          <div className="space-y-10">
            {/* School Banking Details Banner */}
            <div className="bg-gradient-to-r from-indigo-950/60 to-purple-950/60 border border-indigo-900/60 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-white mb-2">🏛️ Official School Bank Account Details</h2>
              {settings ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono mt-4">
                  <div className="bg-gray-900/60 p-3 rounded-lg border border-indigo-900/40">
                    <span className="text-gray-400 block">Bank Name</span>
                    <span className="text-white font-sans font-medium text-sm">{settings.bank_name}</span>
                  </div>
                  <div className="bg-gray-900/60 p-3 rounded-lg border border-indigo-900/40">
                    <span className="text-gray-400 block">Account Name</span>
                    <span className="text-white font-sans font-medium text-sm">{settings.account_name}</span>
                  </div>
                  <div className="bg-gray-900/60 p-3 rounded-lg border border-indigo-900/40">
                    <span className="text-gray-400 block">BSB & Account</span>
                    <span className="text-white font-sans font-medium text-sm">{settings.bsb} / {settings.account_number}</span>
                  </div>
                  <div className="bg-gray-900/60 p-3 rounded-lg border border-indigo-900/40">
                    <span className="text-gray-400 block">Instructions</span>
                    <span className="text-gray-200 text-xs">{settings.payment_instructions}</span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400">School banking details have not been configured yet.</p>
              )}
            </div>

            {/* Submit Payment Form */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-100 mb-1">Submit Payment Transfer Notice</h2>
              <p className="text-sm text-gray-400 mb-4">Notify the school once you have completed your bank transfer.</p>

              <form onSubmit={handlePaymentSubmission} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Select Event:</label>
                    <select 
                      value={selectedEvent} 
                      onChange={e => setSelectedEvent(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    >
                      <option value="" disabled>Choose event...</option>
                      {events.map(ev => (
                        <option key={ev.id} value={ev.id}>{ev.title} (${Number(ev.price).toFixed(2)})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Select Child:</label>
                    <select 
                      value={selectedStudent} 
                      onChange={e => setSelectedStudent(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    >
                      <option value="" disabled>Choose child...</option>
                      {students.map(st => (
                        <option key={st.id} value={st.id}>{st.first_name} {st.last_name} ({st.grade_level || 'General'})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Transfer Reference (e.g., Child Full Name & Grade):</label>
                  <input 
                    type="text" 
                    value={referenceText} 
                    onChange={e => setReferenceText(e.target.value)}
                    placeholder="e.g., John Doe Year 6"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm cursor-pointer transition-colors"
                >
                  {submitting ? 'Submitting Notice...' : 'Submit Payment Notice'}
                </button>
              </form>
            </div>

            {/* Events Grid & Payment Status History */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-100">Upcoming Events & My Payment Status</h2>
              {events.length === 0 ? (
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-gray-400 text-sm">No upcoming events scheduled.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {events.map(ev => {
                    const childPayment = payments.find(p => p.event_id === ev.id);
                    return (
                      <div key={ev.id} className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="text-base font-semibold text-white">{ev.title}</h3>
                            <span className="text-sm font-mono text-indigo-400 font-bold">${Number(ev.price).toFixed(2)}</span>
                          </div>
                          <div className="text-xs font-mono text-gray-400 mt-2 space-y-1">
                            <div>📍 {ev.location}</div>
                            <div>📅 {new Date(ev.event_date).toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="bg-gray-900/60 p-3 rounded-lg border border-gray-800 flex justify-between items-center text-xs font-mono">
                          <span className="text-gray-400">Payment Status:</span>
                          <span className={`px-2.5 py-1 rounded uppercase font-bold ${
                            childPayment?.status === 'approved' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            childPayment?.status === 'rejected' ? 'bg-red-950 text-red-400 border border-red-800' :
                            childPayment?.status === 'pending' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
                            'bg-gray-800 text-gray-400'
                          }`}>
                            {childPayment ? childPayment.status : 'Not Submitted'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}