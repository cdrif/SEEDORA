import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function SchoolRecordsHub({ schoolSlug }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [carnivals, setCarnivals] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch available carnival years
  useEffect(() => {
    async function fetchCarnivalHistory() {
      const { data, error } = await supabase
        .from('seedora_sports_events')
        .select('season_year, event_title, status')
        .eq('school_slug', schoolSlug)
        .order('season_year', { ascending: false });

      if (!error && data) {
        setCarnivals(data);
      }
    }
    fetchCarnivalHistory();
  }, [schoolSlug]);

  // Fetch school records or year-specific results
  useEffect(() => {
    async function fetchRecords() {
      setLoading(true);
      const { data, error } = await supabase
        .from('seedora_school_records')
        .select('*')
        .eq('school_slug', schoolSlug)
        .order('event_name', { ascending: true });

      if (!error && data) {
        setRecords(data);
      }
      setLoading(false);
    }
    fetchRecords();
  }, [schoolSlug, selectedYear]);

Honor Roll / Records Panel UI
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm text-white">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 pb-4 border-b border-gray-800">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Sports Hall of Fame & Records</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Permanent school records and historical carnival archives for {schoolSlug}.
          </p>
        </div>

        {/* Year Selector Filter */}
        <div className="mt-4 sm:mt-0 flex items-center space-x-2">
          <span className="text-xs font-mono text-gray-400">Archive Year:</span>
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

      {/* Records Grid */}
      {loading ? (
        <div className="text-gray-400 text-sm py-8 text-center">Loading historical records...</div>
      ) : records.length === 0 ? (
        <div className="text-gray-500 text-sm py-8 text-center bg-gray-900/40 rounded-lg border border-gray-800/60">
          No historical records logged for this filter yet.
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
  );
}