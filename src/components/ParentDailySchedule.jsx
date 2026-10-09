import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';

export default function ParentDailySchedule() {
  const [loading, setLoading] = useState(true);
  const [childrenClasses, setChildrenClasses] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchChildSchedule();
  }, [selectedDate]);

  async function fetchChildSchedule() {
    try {
      setLoading(true);
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      // Fetch parent's school tenant slug
      const { data: memberData } = await supabase
        .from('school_members')
        .select('school_slug')
        .eq('user_id', user.id)
        .single();

      const currentSlug = memberData?.school_slug;

      // Fetch children linked to this parent user
      const { data: studentData, error: studentError } = await supabase
        .from('parent_students')
        .select('student_id, students(first_name, last_name, grade_level)')
        .eq('parent_id', user.id);

      if (studentError) throw studentError;

      if (!studentData || studentData.length === 0) {
        setChildrenClasses([]);
        return;
      }

      // Collect grade levels for the parent's children
      const studentGrades = studentData.map(s => s.students?.grade_level).filter(Boolean);

      // Fetch schedules matching the school slug, grade levels, and selected date
      const { data: scheduleData, error: sError } = await supabase
        .from('teacher_schedules')
        .select('*')
        .eq('school_slug', currentSlug)
        .eq('date', selectedDate)
        .in('grade_level', studentGrades)
        .order('start_time', { ascending: true });

      if (sError) throw sError;

      // Map children details to their corresponding classes
      const combined = (scheduleData || []).map(schedule => {
        const matchedChild = studentData.find(s => s.students?.grade_level === schedule.grade_level);
        return {
          ...schedule,
          studentName: matchedChild ? `${matchedChild.students.first_name} ${matchedChild.students.last_name}` : 'Child'
        };
      });

      setChildrenClasses(combined);

    } catch (err) {
      console.error('Error loading parent child schedule:', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Child Daily Learning & Catch-Up Hub</h1>
            <p className="text-sm text-gray-400 mt-1">
              View active classes, timeslots, and modules across all your children's teachers for seamless home learning.
            </p>
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Select Date</label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading daily learning records...</div>
        ) : childrenClasses.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-gray-400 text-sm">
            No class schedules found for your children on {selectedDate}. If your child is home sick, check back or review recent module archives.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {childrenClasses.map((item) => (
              <div key={item.id} className="bg-[#111827] border border-gray-800 rounded-xl p-6 flex flex-col justify-between shadow-sm hover:border-gray-700 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2.5 py-1 rounded">
                      {item.grade_level}
                    </span>
                    <span className="text-xs font-mono text-gray-400">
                      {item.start_time} - {item.end_time}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-gray-100 mb-1">{item.subject}</h3>
                  <p className="text-xs font-mono text-indigo-400 mb-3">Module: {item.module_name}</p>
                  
                  <p className="text-sm text-gray-300 bg-gray-900/50 p-3 rounded-lg border border-gray-800/80 mb-4">
                    {item.description || 'No specific notes recorded for this session.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-800/80 flex justify-between items-center text-xs text-gray-400 font-mono">
                  <span>Student: <strong className="text-gray-200">{item.studentName}</strong></span>
                  <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-900 px-2 py-0.5 rounded">Active Record</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}