import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import GlobalHeader from './GlobalHeader';

export default function TeachEvents() {
  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);

  // New Event Form State
  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [location, setLocation] = useState('');
  const [price, setPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function initTeacherEvents() {
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

        // Fetch events, students, and payment statuses
        const [evRes, stRes, payRes] = await Promise.all([
          supabase.from('school_events').select('*').eq('school_slug', currentSlug).order('event_date', { ascending: true }),
          supabase.from('students').select('*').eq('school_slug', currentSlug),
          supabase.from('event_payments').select('*').eq('school_slug', currentSlug)
        ]);

        setEvents(evRes.data || []);
        setStudents(stRes.data || []);
        setPayments(payRes.data || []);
      } catch (err) {
        console.error('Error loading teacher events:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initTeacherEvents();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!title || !eventDate || !location || price === '') {
      alert('Please fill out all event fields.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('school_events').insert([{
        school_slug: schoolSlug,
        title,
        event_date: eventDate,
        location,
        price: parseFloat(price),
        created_by: user.id
      }]);

      if (error) throw error;
      alert('Event created successfully.');
      window.location.reload();
    } catch (err) {
      alert('Error creating event: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!confirm('Are you sure you want to remove this event?')) return;
    try {
      const { error } = await supabase.from('school_events').delete().eq('id', id);
      if (error) throw error;
      setEvents(events.filter(ev => ev.id !== id));
    } catch (err) {
      alert('Error deleting event: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Teacher Event Management</h1>
          <p className="text-sm text-gray-400 mt-1">
            Create school excursions/events and track student payment standings in real time.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading events...</div>
        ) : (
          <div className="space-y-10">
            {/* Create Event Form */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm max-w-2xl">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Add New School Event</h2>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Event Title:</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g., Year 6 Zoo Excursion"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Date & Time:</label>
                    <input 
                      type="datetime-local" 
                      value={eventDate} 
                      onChange={e => setEventDate(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Price ($):</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={price} 
                      onChange={e => setPrice(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Location:</label>
                  <input 
                    type="text" 
                    value={location} 
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g., Taronga Zoo"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm cursor-pointer transition-colors"
                >
                  {submitting ? 'Publishing...' : 'Publish Event'}
                </button>
              </form>
            </div>

            {/* Event List & Payment Breakdown */}
            <div className="space-y-6">
              <h2 className="text-lg font-semibold text-gray-100">Active Events & Payment Rosters</h2>
              {events.length === 0 ? (
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-gray-400 text-sm">No active events found.</div>
              ) : (
                events.map(ev => {
                  const evPayments = payments.filter(p => p.event_id === ev.id);
                  return (
                    <div key={ev.id} className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-800 pb-4">
                        <div>
                          <h3 className="text-base font-semibold text-white">{ev.title}</h3>
                          <p className="text-xs font-mono text-gray-400 mt-0.5">
                            📍 {ev.location} | 📅 {new Date(ev.event_date).toLocaleString()} | 💰 ${Number(ev.price).toFixed(2)}
                          </p>
                        </div>
                        <button 
                          onClick={() => handleDeleteEvent(ev.id)}
                          className="bg-red-950/40 text-red-400 border border-red-900/60 hover:bg-red-950 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer"
                        >
                          Remove Event
                        </button>
                      </div>

                      {/* Paid vs Outstanding Roster */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
                          <h4 className="text-xs font-mono text-emerald-400 uppercase tracking-wider mb-2">Paid / Approved Students</h4>
                          <ul className="space-y-1 text-xs font-mono text-gray-300">
                            {students.map(st => {
                              const match = evPayments.find(p => p.student_id === st.id && p.status === 'approved');
                              if (!match) return null;
                              return <li key={st.id} className="flex justify-between"><span>{st.first_name} {st.last_name}</span> <span className="text-emerald-400">Paid ✓</span></li>;
                            })}
                            {!students.some(st => evPayments.some(p => p.student_id === st.id && p.status === 'approved')) && (
                              <li className="text-gray-500 italic">No approved payments yet</li>
                            )}
                          </ul>
                        </div>

                        <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-lg">
                          <h4 className="text-xs font-mono text-amber-400 uppercase tracking-wider mb-2">Outstanding / Pending</h4>
                          <ul className="space-y-1 text-xs font-mono text-gray-300">
                            {students.map(st => {
                              const match = evPayments.find(p => p.student_id === st.id && p.status === 'approved');
                              const pending = evPayments.find(p => p.student_id === st.id && p.status === 'pending');
                              if (match) return null;
                              return (
                                <li key={st.id} className="flex justify-between">
                                  <span>{st.first_name} {st.last_name}</span>
                                  <span className={pending ? 'text-blue-400' : 'text-gray-500'}>
                                    {pending ? 'Pending Approval ⏳' : 'Outstanding ❌'}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}