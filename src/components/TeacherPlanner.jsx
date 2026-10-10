import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';

export default function TeacherPlanner() {
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState([]);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [availableGrades, setAvailableGrades] = useState(['Grade 8', 'Grade 9', 'Grade 10']);
  
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
        // Fetch schedules
        const { data: scheduleData, error: sError } = await supabase
          .from('teacher_schedules')
          .select('*')
          .eq('school_slug', currentSlug)
          .order('date', { ascending: false });

        if (sError) throw sError;
        setSchedules(scheduleData || []);

        // Fetch unique grade levels from students table for this tenant
        const { data: gradeData } = await supabase
          .from('students')
          .select('grade_level')
          .eq('school_slug', currentSlug);

        if (gradeData && gradeData.length > 0) {
          const uniqueGrades = [...new Set(gradeData.map(s => s.grade_level))];
          setAvailableGrades(uniqueGrades);
        }
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
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 antialiased">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Teacher Daily & Monthly Planner</h1>
          <p className="text-sm sm:text-base text-gray-400 mt-2 max-w-2xl">
            Allocate classes, stipulate grade levels, subjects, and timeslots up to a month in advance.
          </p>
        </div>

        {/* Schedule Entry Form */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl p-6 sm:p-8 mb-10 shadow-lg">
          <h3 className="text-lg font-semibold text-white mb-6">Add Class Allocation</h3>
          <form onSubmit={handleCreateSchedule} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">Date</label>
              <input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">Start Timeslot</label>
              <input 
                type="time" 
                value={startTime} 
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">End Timeslot</label>
              <input 
                type="time" 
                value={endTime} 
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">Grade Level</label>
              <input 
                type="text" 
                list="grade-options"
                placeholder="e.g. Grade 8"
                value={gradeLevel} 
                onChange={(e) => setGradeLevel(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
              />
              <datalist id="grade-options">
                {availableGrades.map((grade) => (
                  <option key={grade} value={grade} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">Subject</label>
              <input 
                type="text" 
                placeholder="e.g. Mathematics"
                value={subject} 
                onChange={(e) => setSubject(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">Module Name / Topic</label>
              <input 
                type="text" 
                placeholder="e.g. Algebra Fundamentals"
                value={moduleName} 
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                required
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-300 mb-2">Lesson Details / Notes (Optional)</label>
              <textarea 
                rows="3"
                placeholder="Outline class requirements..."
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end pt-2">
              <button 
                type="submit" 
                disabled={submitting}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 rounded-xl text-sm shadow-md transition-all disabled:opacity-50"
              >
                {submitting ? 'Publishing...' : 'Publish Class Allocation'}
              </button>
            </div>
          </form>
        </div>

        {/* Historical Records & Search Controls */}
        <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="p-6 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="text-lg font-semibold text-white">Allotted Classes History</h3>
            
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
              <input 
                type="text" 
                placeholder="Search subject, module..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <input 
                type="text" 
                placeholder="Filter grade..."
                value={filterGrade}
                onChange={(e) => setFilterGrade(e.target.value)}
                className="bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition sm:w-36"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-gray-400 text-sm text-center">Loading allotted records...</div>
          ) : paginatedSchedules.length === 0 ? (
            <div className="p-8 text-gray-400 text-sm text-center">No class allocations found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/40 text-xs font-semibold uppercase tracking-wider">
                    <th className="py-4 px-6">Date</th>
                    <th className="py-4 px-6">Timeslot</th>
                    <th className="py-4 px-6">Grade Level</th>
                    <th className="py-4 px-6">Subject</th>
                    <th className="py-4 px-6">Module</th>
                    <th className="py-4 px-6">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-sm">
                  {paginatedSchedules.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-900/30 transition-colors">
                      <td className="py-4 px-6 text-gray-300 font-medium whitespace-nowrap">{item.date}</td>
                      <td className="py-4 px-6 text-gray-300 whitespace-nowrap">{item.start_time} - {item.end_time}</td>
                      <td className="py-4 px-6 text-indigo-400 font-semibold whitespace-nowrap">{item.grade_level}</td>
                      <td className="py-4 px-6 text-white font-medium whitespace-nowrap">{item.subject}</td>
                      <td className="py-4 px-6 text-gray-300">{item.module_name}</td>
                      <td className="py-4 px-6 text-gray-400 max-w-xs truncate">{item.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm text-gray-400">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-gray-900 border border-gray-700/80 rounded-xl hover:bg-gray-800 transition disabled:opacity-40 text-gray-200 text-xs font-medium"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-gray-900 border border-gray-700/80 rounded-xl hover:bg-gray-800 transition disabled:opacity-40 text-gray-200 text-xs font-medium"
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