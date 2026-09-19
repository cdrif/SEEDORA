import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import GlobalHeader from './GlobalHeader';

export default function SportsViewParent() {
  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [itineraries, setItineraries] = useState([]);
  const [houses, setHouses] = useState([]);
  
  // Main view tab: 'itinerary' (your original code) or 'records' (Hall of Fame)
  const [activeTab, setActiveTab] = useState('itinerary');
  const [records, setRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loadingRecords, setLoadingRecords] = useState(false);

  useEffect(() => {
    async function fetchParentSportsData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Get linked students for this parent
        const { data: links } = await supabase
          .from('parent_student_links')
          .select('student_code, student_name')
          .eq('parent_id', user.id);

        // Fetch house teams standings
        const { data: houseData } = await supabase
          .from('seedora_sports_houses')
          .select('*')
          .order('total_points', { ascending: false });

        if (houseData) setHouses(houseData);

        if (links && links.length > 0) {
          // Find registrations matching linked students
          const studentNames = links.map(l => l.student_name);
          // Fetch student IDs matching names or link codes
          const { data: studentRecords } = await supabase
            .from('students')
            .select('id, first_name, last_name, school_slug');

          if (studentRecords && studentRecords.length > 0) {
            // Set school slug from the first matched student for records query
            if (studentRecords[0]?.school_slug) {
              setSchoolSlug(studentRecords[0].school_slug);
            }

            const studentIds = studentRecords.map(s => s.id);
            const { data: regs } = await supabase
              .from('seedora_sports_registrations')
              .select(`
                id,
                event_category,
                heat_number,
                start_time,
                placement,
                seedora_sports_events (
                  event_name,
                  event_date,
                  location
                ),
                students (
                  first_name,
                  last_name
                )
              `)
              .in('student_id', studentIds);

            if (regs) setItineraries(regs);
          }
        }
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchParentSportsData();
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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Carnival Itinerary & House Standings</h1>
            <p className="text-sm text-gray-400 mt-1">Track your children's event schedules and view live house points in real time.</p>
          </div>

          {/* Tab Switcher */}
          <div className="mt-4 sm:mt-0 flex bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setActiveTab('itinerary')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'itinerary' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Itinerary & Standings
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
          <div className="text-gray-400">Loading sports itinerary...</div>
        ) : activeTab === 'itinerary' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left 2 Cols: Child Itinerary */}
            <div className="lg:col-span-2 space-y-6">
              <h2 className="text-lg font-semibold text-gray-100">My Children's Event Schedule</h2>
              {itineraries.length === 0 ? (
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-gray-400 text-sm">
                  No upcoming sports event heats recorded for your linked children yet.
                </div>
              ) : (
                itineraries.map(item => (
                  <div key={item.id} className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-bold">
                          {item.event_category} ({item.heat_number || 'Heat 1'})
                        </span>
                        <h3 className="text-base font-semibold text-white mt-2">
                          {item.students?.first_name} {item.students?.last_name}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Carnival: {item.seedora_sports_events?.event_name} @ {item.seedora_sports_events?.location || 'School Oval'}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono text-gray-300 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded">
                          🕒 {item.start_time || 'TBD'}
                        </span>
                        {item.placement && (
                          <div className="mt-2 text-xs font-bold text-amber-400">
                            Result: {item.placement}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Right Col: Live House Leaderboard */}
            <div>
              <h2 className="text-lg font-semibold text-gray-100 mb-6">Live House Leaderboard</h2>
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm space-y-4">
                {houses.length === 0 ? (
                  <p className="text-gray-400 text-sm">No house points registered yet.</p>
                ) : (
                  houses.map((house, idx) => (
                    <div key={house.id} className="flex items-center justify-between p-3 bg-gray-900 border border-gray-800 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-mono font-bold text-gray-500">#{idx + 1}</span>
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: house.color_hex }}></span>
                        <span className="text-sm font-medium text-white">{house.house_name}</span>
                      </div>
                      <span className="text-sm font-bold font-mono text-indigo-400">{house.total_points} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>

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
