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
        .select('*, teacher_profiles:teacher_id(first_name, last_name)')
        .eq('school_slug', currentSlug)
        .eq('date', selectedDate)
        .in('grade_level', studentGrades)
        .order('start_time', { ascending: true });

      if (sError) throw sError;

      // Map children details and teacher names to their corresponding classes
      const combined = (scheduleData || []).map(schedule => {
        const matchedChild = studentData.find(s => s.students?.grade_level === schedule.grade_level);
        const teacherName = schedule.teacher_profiles 
          ? `${schedule.teacher_profiles.first_name || ''} ${schedule.teacher_profiles.last_name || ''}`.trim() 
          : 'Assigned Teacher';

        return {
          ...schedule,
          studentName: matchedChild ? `${matchedChild.students.first_name} ${matchedChild.students.last_name}` : 'Child',
          teacherName: teacherName || 'Staff Member'
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
    <div className="min-h-screen bg-[#0b0f19] text-gray-100 antialiased">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Child Schedule & Learning Hub</h1>
            <p className="text-sm sm:text-base text-gray-400 mt-2 max-w-2xl">
              View your child's exact daily schedule, subject allocations, assigned teachers, and timeslots[cite: 1].
            </p>
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-xs font-medium text-gray-300 mb-2">Select Date</label>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-auto bg-gray-900/80 border border-gray-700/80 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-gray-400 py-12 text-center text-sm">Loading daily schedule records...</div>
        ) : childrenClasses.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 rounded-2xl p-8 text-gray-400 text-sm text-center shadow-lg">
            No class schedules found for your children on {selectedDate}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {childrenClasses.map((item) => (
              <div key={item.id} className="bg-[#111827] border border-gray-800 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-gray-700 transition-all">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-semibold bg-indigo-950/80 text-indigo-300 border border-indigo-800/80 px-3 py-1 rounded-full">
                      {item.grade_level}
                    </span>
                    <span className="text-xs font-medium text-gray-300 bg-gray-900/90 px-3 py-1 rounded-lg border border-gray-800">
                      {item.start_time} - {item.end_time}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1.5">{item.subject}</h3>
                  <p className="text-xs text-indigo-400 font-medium mb-1">Topic: {item.module_name}</p>
                  <p className="text-xs text-gray-400 mb-4">Teacher: <span className="text-gray-200 font-medium">{item.teacherName}</span></p>
                  
                  <p className="text-sm text-gray-300 bg-gray-900/60 p-4 rounded-xl border border-gray-800/80 mb-5 leading-relaxed">
                    {item.description || 'No specific notes recorded for this timeslot.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-800/80 flex justify-between items-center text-xs text-gray-400">
                  <span>Student: <strong className="text-gray-200">{item.studentName}</strong></span>
                  <span className="text-emerald-400 bg-emerald-950/60 border border-emerald-900/80 px-2.5 py-1 rounded-full font-medium">Synced Active</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}