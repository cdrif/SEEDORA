import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';

export default function TeacherPlanner() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [schoolSlug, setSchoolSlug] = useState('');
  
  // Form State
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [subject, setSubject] = useState('');
  const [moduleName, setModuleName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Search & Pagination State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTeacherData();
  }, []);

  async function fetchTeacherData() {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      const { data: memberData } = await supabase
        .from('school_members')
        .select('school_slug')
        .eq('user_id', user.id)
        .single();

      const currentSlug = memberData?.school_slug;
      setSchoolSlug(currentSlug);

      if (currentSlug) {
        const { data: scheduleData, error: sError } = await supabase
          .from('teacher_schedules')
          .select('*')
          .eq('school_slug', currentSlug)
          .order('date', { ascending: false });

        if (sError) throw sError;
        setSchedules(scheduleData || []);
      }
    } catch (err) {
      console.error('Error loading teacher schedules:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateSchedule(e) {
    e.preventDefault();
    if (!date || !startTime || !endTime || !gradeLevel || !subject || !moduleName) {
      alert('Please fill out all required fields.');
      return;
    }

    try {
      setSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('teacher_schedules').insert([
        {
          school_slug: schoolSlug,
          teacher_id: user.id,
          date,
          start_time: startTime,
          end_time: endTime,
          grade_level: gradeLevel,
          subject,
          module_name: moduleName,
          description
        }
      ]);

      if (error) throw error;

      // Reset form & reload records
      setDate('');
      setStartTime('');
      setEndTime('');
      setGradeLevel('');
      setSubject('');
      setModuleName('');
      setDescription('');
      fetchTeacherData();
    } catch (err) {
      console.error('Error saving schedule:', err.message);
      alert('Failed to save schedule entry.');
    } finally {
      setSubmitting(false);
    }
  }

  // Filter & Pagination Logic
  const filteredSchedules = schedules.filter(item => {
    const matchesSearch = 
      item.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.module_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.grade_level.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = filterGrade ? item.grade_level === filterGrade : true;
    return matchesSearch && matchesGrade;
  });

  const totalPages = Math.ceil(filteredSchedules.length / itemsPerPage) || 1;
  const paginatedSchedules = filteredSchedules.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Teacher Daily & Weekly Planner</h1>
          <p className="text-sm text-gray-400 mt-1">
            Plan classes up to a month in advance, assign modules, and review historical schedules securely.
          </p>
        </div>

        {/* Schedule Entry Form */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 mb-8 shadow-sm">
          <h3 className="text-base font-semibold text-gray-100 mb-4">Add New Class Schedule / Module</h3>
          <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Start Time</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">End Time</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Grade Level (Eg. Grade 2)</label>
              <input 
                type="text" 
                placeholder="Grade 2"
                value={gradeLevel} 
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Subject (Eg. Art)</label>
              <input 
                type="text" 
                placeholder="Art"
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Module Name / Topic</label>
              <input 
                type="text" 
                placeholder="Watercolors & Perspective"
                value={moduleName} 
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-mono text-gray-400 mb-1">Lesson Details / Catch-up Notes</label>
              <textarea 
                rows="2"
                placeholder="Outline what students will cover today..."
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : 'Publish Schedule Entry'}
              </button>
            </div>
          </form>
        </div>

        {/* Historical Records & Search Controls */}
        <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-base font-semibold text-gray-100">Historical Schedule Records</h3>
            
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="Search subject, module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <input 
                type="text" 
                placeholder="Filter grade..."
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono w-32"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-6 text-gray-400 text-sm">Loading historical records...</div>
          ) : paginatedSchedules.length === 0 ? (
            <div className="p-6 text-gray-400 text-sm">No schedule entries found matching criteria.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/50 font-mono text-xs">
                    <th className="py-3 px-6">Date</th>
                    <th className="py-3 px-6">Time</th>
                    <th className="py-3 px-6">Grade</th>
                    <th className="py-3 px-6">Subject</th>
                    <th className="py-3 px-6">Module</th>
                    <th className="py-3 px-6">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                  {paginatedSchedules.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="py-3 px-6 text-gray-300">{item.date}</td>
                      <td className="py-3 px-6 text-gray-300">{item.start_time} - {item.end_time}</td>
                      <td className="py-3 px-6 text-indigo-300 font-bold">{item.grade_level}</td>
                      <td className="py-3 px-6 text-gray-200 font-sans font-medium">{item.subject}</td>
                      <td className="py-3 px-6 text-gray-300">{item.module_name}</td>
                      <td className="py-3 px-6 text-gray-400 max-w-xs truncate">{item.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-gray-800 flex justify-between items-center text-xs font-mono text-gray-400">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 bg-gray-900 border border-gray-800 rounded hover:bg-gray-800 disabled:opacity-40"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 bg-gray-900 border border-gray-800 rounded hover:bg-gray-800 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}