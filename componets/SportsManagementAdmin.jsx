import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import GlobalHeader from './GlobalHeader';

export default function SportsManagementAdmin() {
  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [events, setEvents] = useState([]);
  const [houses, setHouses] = useState([]);
  
  // Main view tab: 'management' (your original code) or 'records' (Hall of Fame)
  const [activeTab, setActiveTab] = useState('management');
  const [records, setRecords] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [loadingRecords, setLoadingRecords] = useState(false);

  // Form states for New Carnival
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [creatingEvent, setCreatingEvent] = useState(false);

  // Form states for House Teams
  const [houseName, setHouseName] = useState('');
  const [houseColor, setHouseColor] = useState('#3b82f6');
  const [addingHouse, setAddingHouse] = useState(false);

  useEffect(() => {
    async function fetchAdminSportsData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data: member } = await supabase
          .from('school_members')
          .select('school_slug, role')
          .eq('user_id', user.id)
          .single();

        if (!member || member.role !== 'admin') throw new Error('Admin privileges required.');
        setSchoolSlug(member.school_slug);

        // Fetch events & houses
        const [eventRes, houseRes] = await Promise.all([
          supabase.from('seedora_sports_events').select('*').eq('school_slug', member.school_slug).order('event_date', { ascending: true }),
          supabase.from('seedora_sports_houses').select('*').eq('school_slug', member.school_slug).order('total_points', { ascending: false })
        ]);

        if (eventRes.data) setEvents(eventRes.data);
        if (houseRes.data) setHouses(houseRes.data);

      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchAdminSportsData();
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

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!eventName || !eventDate) return;
    setCreatingEvent(true);

    try {
      const { error } = await supabase.from('seedora_sports_events').insert([{
        school_slug: schoolSlug,
        event_name: eventName,
        event_date: eventDate,
        location: eventLocation,
        description: eventDesc,
        status: 'upcoming'
      }]);

      if (error) throw error;
      alert('Sports carnival created successfully!');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setCreatingEvent(false);
    }
  };

  const handleCreateHouse = async (e) => {
    e.preventDefault();
    if (!houseName) return;
    setAddingHouse(true);

    try {
      const { error } = await supabase.from('seedora_sports_houses').insert([{
        school_slug: schoolSlug,
        house_name: houseName,
        color_hex: houseColor,
        total_points: 0
      }]);

      if (error) throw error;
      alert('House team added successfully!');
      window.location.reload();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setAddingHouse(false);
    }
  };

  const handleUpdatePoints = async (houseId, currentPoints, delta) => {
    const newTotal = Math.max(0, currentPoints + delta);
    const { error } = await supabase
      .from('seedora_sports_houses')
      .update({ total_points: newTotal })
      .eq('id', houseId);

    if (!error) {
      setHouses(houses.map(h => h.id === houseId ? { ...h, total_points: newTotal } : h));
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Sports Day & Carnival Administration</h1>
            <p className="text-sm text-gray-400 mt-1">Manage school athletics carnivals, track events, and live house scoreboards.</p>
          </div>

          {/* Tab Switcher */}
          <div className="mt-4 sm:mt-0 flex bg-gray-900 p-1 rounded-lg border border-gray-800">
            <button
              onClick={() => setActiveTab('management')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                activeTab === 'management' ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Live & Setup
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
          <div className="text-gray-400">Loading sports management panel...</div>
        ) : activeTab === 'management' ? (
          <div className="space-y-8">
            
            {/* Grid for Creating Events & Houses */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Create Carnival Form */}
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">Create Sports Carnival</h2>
                <form onSubmit={handleCreateEvent} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Carnival Name:</label>
                    <input 
                      type="text" 
                      value={eventName} 
                      onChange={e => setEventName(e.target.value)} 
                      placeholder="e.g., Annual Athletics Carnival 2026" 
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Date:</label>
                    <input 
                      type="date" 
                      value={eventDate} 
                      onChange={e => setEventDate(e.target.value)} 
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Location / Venue:</label>
                    <input 
                      type="text" 
                      value={eventLocation} 
                      onChange={e => setEventLocation(e.target.value)} 
                      placeholder="School Oval / Local Stadium" 
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" 
                    />
                  </div>
                  <button type="submit" disabled={creatingEvent} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer">
                    {creatingEvent ? 'Creating...' : 'Publish Carnival Event'}
                  </button>
                </form>
              </div>

              {/* Create House Team Form */}
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-100 mb-4">Register House Team</h2>
                <form onSubmit={handleCreateHouse} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">House Name:</label>
                    <input 
                      type="text" 
                      value={houseName} 
                      onChange={e => setHouseName(e.target.value)} 
                      placeholder="e.g., Red Dragons / Blue Falcons" 
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">House Theme Color:</label>
                    <input 
                      type="color" 
                      value={houseColor} 
                      onChange={e => setHouseColor(e.target.value)} 
                      className="w-full h-10 bg-gray-900 border border-gray-800 rounded-lg p-1 cursor-pointer" 
                    />
                  </div>
                  <button type="submit" disabled={addingHouse} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer">
                    {addingHouse ? 'Adding...' : 'Add House Team'}
                  </button>
                </form>
              </div>

            </div>

            {/* Live House Points Leaderboard Manager */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Live House Scoreboard Management</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {houses.map(house => (
                  <div key={house.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="w-4 h-4 rounded-full" style={{ backgroundColor: house.color_hex }}></span>
                        <h3 className="font-semibold text-white">{house.house_name}</h3>
                      </div>
                      <p className="text-2xl font-bold font-mono text-indigo-400 mt-2">{house.total_points} pts</p>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <button onClick={() => handleUpdatePoints(house.id, house.total_points, 10)} className="flex-1 bg-green-950 hover:bg-green-900 border border-green-800 text-green-300 py-1 rounded text-xs font-mono cursor-pointer">+10 pts</button>
                      <button onClick={() => handleUpdatePoints(house.id, house.total_points, -10)} className="flex-1 bg-red-950 hover:bg-red-900 border border-red-800 text-red-300 py-1 rounded text-xs font-mono cursor-pointer">-10 pts</button>
                    </div>
                  </div>
                ))}
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