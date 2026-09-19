import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import GlobalHeader from './GlobalHeader';

export default function SportsManagementTeacher() {
  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [events, setEvents] = useState([]);
  const [students, setStudents] = useState([]);
  
  // Main tab: 'management' (your original code) or 'records' (Hall of Fame)
  const [activeTab, setActiveTab] = useState('management');
  const [records, setRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loadingRecords, setLoadingRecords] = useState(false);
  
  // Result entry form states
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [eventCategory, setEventCategory] = useState('100m Sprint');
  const [heatNumber, setHeatNumber] = useState('Heat 1');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [placement, setPlacement] = useState('1st');
  const [points, setPoints] = useState(10);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchTeacherSportsData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: member } = await supabase
          .from('school_members')
          .select('school_slug')
          .eq('user_id', user.id)
          .single();

        if (!member) throw new Error('Member record not found');
        setSchoolSlug(member.school_slug);

        const [eventRes, studentRes] = await Promise.all([
          supabase.from('seedora_sports_events').select('*').eq('school_slug', member.school_slug),
          supabase.from('students').select('id, first_name, last_name, grade_level').eq('school_slug', member.school_slug)
        ]);

        if (eventRes.data) setEvents(eventRes.data);
        if (studentRes.data) setStudents(studentRes.data);

      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchTeacherSportsData();
  }, []);

  // Fetch school records when switching to the records tab
  useEffect(() => {
    if (activeTab !== 'records' || !schoolSlug) return;

    async function fetchSchoolRecords() {
      setLoadingRecords(true);
      const { data, error } = await supabase
        .from('seedora_school_records')
        .select('*')
        .eq('school_slug', schoolSlug)
        .eq('season_year', selectedYear)
        .order('event_name', { ascending: true });

      if (!error && data) {
        setRecords(data);
      }
      setLoadingRecords(false);
    }
    fetchSchoolRecords();
  }, [activeTab, schoolSlug, selectedYear]);

  const handleLogResult = async (e) => {
    e.preventDefault();
    if (!selectedEventId || !selectedStudentId) return;
    setSubmitting(true);

    try {
      const { error } = await supabase.from('seedora_sports_registrations').insert([{
        event_id: selectedEventId,
        student_id: selectedStudentId,
        event_category: eventCategory,
        heat_number: heatNumber,
        start_time: startTime,
        placement: placement,
        points_awarded: parseInt(points, 10)
      }]);

      if (error) throw error;
      alert('Student event result & placement logged successfully!');
      setSelectedStudentId('');
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />
      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Teacher Field Management & Result Entry</h1>
            <p className="text-sm text-gray-400 mt-1">Assign students to heat slots and record track/field placements instantly.</p>
          </div>

          {/* Tab Switcher */}
          <div className="mt-4 sm:mt-0 flex bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setActiveTab('management')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'management' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Result Entry
            </button>
            <button
              onClick={() => setActiveTab('records')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'records' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Hall of Fame & Records
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading sports field tools...</div>
        ) : activeTab === 'management' ? (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-100 mb-4">Record Student Heat Placement</h2>
            
            <form onSubmit={handleLogResult} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Select Carnival Event:</label>
                <select 
                  value={selectedEventId} 
                  onChange={e => setSelectedEventId(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                  required
                >
                  <option value="" disabled>Choose carnival...</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id}>{ev.event_name} ({ev.event_date})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-gray-400 mb-1">Select Student:</label>
                <select 
                  value={selectedStudentId} 
                  onChange={e => setSelectedStudentId(e.target.value)} 
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                  required
                >
                  <option value="" disabled>Choose student from directory...</option>
                  {students.map(st => (
                    <option key={st.id} value={st.id}>{st.first_name} {st.last_name} ({st.grade_level})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Event Category:</label>
                  <input 
                    type="text" 
                    value={eventCategory} 
                    onChange={e => setEventCategory(e.target.value)} 
                    placeholder="e.g., 100m Sprint / Long Jump" 
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Heat Number / Identifier:</label>
                  <input 
                    type="text" 
                    value={heatNumber} 
                    onChange={e => setHeatNumber(e.target.value)} 
                    placeholder="Heat 2" 
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Start Time:</label>
                  <input 
                    type="text" 
                    value={startTime} 
                    onChange={e => setStartTime(e.target.value)} 
                    placeholder="10:15 AM" 
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Placement Result:</label>
                  <select 
                    value={placement} 
                    onChange={e => setPlacement(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                  >
                    <option value="1st">1st Place</option>
                    <option value="2nd">2nd Place</option>
                    <option value="3rd">3rd Place</option>
                    <option value="Finalist">Finalist</option>
                    <option value="Participant">Participant</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Points Awarded:</label>
                  <input 
                    type="number" 
                    value={points} 
                    onChange={e => setPoints(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white font-mono" 
                  />
                </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer mt-4">
                {submitting ? 'Recording...' : 'Save Result & Update Scoreboard'}
              </button>
            </form>
          </div>
        ) : (
          /* Hall of Fame & Records Tab */
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">School Records & Hall of Fame</h2>
                <p className="text-sm text-gray-400 mt-0.5">Review permanent athletic records year-by-year.</p>
              </div>

              <div className="mt-4 sm:mt-0 flex items-center space-x-2">
                <span className="text-xs font-mono text-gray-400">Season Archive:</span>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                >
                  {[2026, 2025, 2024, 2023].map((yr) => (
                    <option key={yr} value={yr}>{yr} Season</option>
                  ))}
                </select>
              </div>
            </div>

            {loadingRecords ? (
              <div className="text-gray-400 text-sm py-8 text-center">Loading school records...</div>
            ) : records.length === 0 ? (
              <div className="text-gray-500 text-sm py-8 text-center bg-gray-900/40 rounded-lg border border-gray-800/60">
                No historical records found for the {selectedYear} season.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {records.map((rec) => (
                  <div 
                    key={rec.id}
                    className="bg-gray-900/60 border border-gray-800 rounded-lg p-4 hover:border-indigo-500/50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-indigo-400 uppercase tracking-wider">{rec.event_name}</span>
                      <span className="text-xs font-mono bg-indigo-950/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-900">
                        {rec.season_year}
                      </span>
                    </div>
                    
                    <div className="text-xl font-bold text-gray-100 mb-1">{rec.record_value}</div>
                    
                    <div className="flex justify-between items-center text-xs text-gray-400 mt-3 pt-2 border-t border-gray-800/80">
                      <span className="font-medium text-gray-300">{rec.student_name}</span>
                      <span className="font-mono text-gray-500">{rec.house_name} House</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}