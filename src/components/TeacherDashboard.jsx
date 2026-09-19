import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';
import { logComplianceAccess } from '../utils/auditLogger';

// Helper to play your custom uploaded audio files
function playNotificationSound(isCritical = false) {
  try {
    const audioPath = isCritical 
      ? '/sounds/tithuh-warning-545568.mp3' // Critical warning sound for teachers
      : '/sounds/liecio-message-alert-190042.mp3'; // Gentle chime for broadcasts[cite: 2]
      
    const audio = new Audio(audioPath);
    audio.play().catch((err) => {
      console.log("Audio playback blocked until user interacts with the page:", err);
    });
  } catch (e) {
    console.log("Audio playback error:", e);
  }
}

export default function TeacherDashboard() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [currentTeacherId, setCurrentTeacherId] = useState('');
  const [activeNotification, setActiveNotification] = useState(null);

  // States for Teacher Interactive Modules & Submissions
  const [selectedClass, setSelectedClass] = useState('');
  const [classStudents, setClassStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentAttendance, setStudentAttendance] = useState({});
  const [submittingAttendance, setSubmittingAttendance] = useState(false);

  // States for Teacher Daily Attendance & Payroll Check-in
  const [teacherStatusType, setTeacherStatusType] = useState('Present');
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [attendanceHistory, setAttendanceHistory] = useState([]);

  // States for Assignment / Grade Submission Panel
  const [assignmentTitle, setAssignmentTitle] = useState('');
  const [assignmentCategory, setAssignmentCategory] = useState('Homework');
  const [assignmentMaxPoints, setAssignmentMaxPoints] = useState('100');
  const [creatingAssignment, setCreatingAssignment] = useState(false);

  // States for Teacher-Student Direct Messaging / Notes
  const [selectedStudentForNote, setSelectedStudentForNote] = useState('');
  const [teacherNote, setTeacherNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    async function fetchTeacherData() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');
        setCurrentTeacherId(user.id);

        const { data: memberData, error: memberError } = await supabase
          .from('school_members')
          .select('school_id, school_slug, role')
          .eq('user_id', user.id)
          .single();

        if (memberError || !memberData || !['teacher', 'admin'].includes(memberData.role)) {
          throw new Error('Access denied: Teacher or Administrator privileges required.');
        }

        const fetchedSlug = memberData.school_slug;
        setSchoolSlug(fetchedSlug);
        setSchoolId(memberData.school_id);

        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, name, description, school_id')
          .eq('school_id', memberData.school_id);

        if (classError) throw classError;

        setClasses(classData || []);

        // Fetch Teacher's own attendance / payroll check-in history
        const { data: attendanceLogData } = await supabase
          .from('teacher_attendance')
          .select('*')
          .eq('teacher_id', user.id)
          .order('timestamp', { ascending: false });

        if (attendanceLogData) {
          setAttendanceHistory(attendanceLogData);
        }

        if (classData && classData.length > 0) {
          await logComplianceAccess('VIEW_TEACHER_CLASSES', `Viewed ${classData.length} class roster section(s)`);
        }
      } catch (err) {
        console.error('Teacher dashboard error:', err.message);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTeacherData();
  }, []);

  // Fetch students when a class is selected
  useEffect(() => {
    async function fetchStudentsForClass() {
      if (!selectedClass || !schoolSlug) {
        setClassStudents([]);
        return;
      }

      setLoadingStudents(true);
      try {
        const { data, error } = await supabase
          .from('students')
          .select('id, first_name, last_name, grade_level')
          .eq('school_slug', schoolSlug);

        if (error) throw error;
        setClassStudents(data || []);

        // Initialize default attendance state to 'Present'
        const initialStates = {};
        (data || []).forEach(s => {
          initialStates[s.id] = 'Present';
        });
        setStudentAttendance(initialStates);
      } catch (err) {
        console.error('Error fetching class students:', err.message);
      } finally {
        setLoadingStudents(false);
      }
    }

    fetchStudentsForClass();
  }, [selectedClass, schoolSlug]);

  // Realtime notification listener hook effect
  useEffect(() => {
    if (!schoolSlug) return;

    const channel = supabase
      .channel('public:school_notifications:teacher')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'school_notifications',
          filter: `school_slug=eq.${schoolSlug}`
        },
        (payload) => {
          const newNotif = payload.new;
          if (newNotif.target_role === 'teacher' || newNotif.target_role === 'all') {
            setActiveNotification(newNotif);
            playNotificationSound(newNotif.is_critical);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolSlug]);

  const handleAttendanceChange = (studentId, status) => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleSaveAttendance = async (e) => {
    e.preventDefault();
    if (!selectedClass) {
      alert("Please select a class first.");
      return;
    }

    setSubmittingAttendance(true);
    try {
      const records = Object.entries(studentAttendance).map(([studentId, status]) => ({
        class_id: selectedClass,
        student_id: studentId,
        date: attendanceDate,
        status: status,
        school_slug: schoolSlug
      }));

      if (records.length === 0) {
        alert("No attendance selections made.");
        setSubmittingAttendance(false);
        return;
      }

      const { error } = await supabase
        .from('attendance_records')
        .upsert(records, { onConflict: 'class_id,student_id,date' });

      if (error) throw error;

      alert("Attendance saved successfully!");
    } catch (err) {
      alert("Error saving attendance: " + err.message);
    } finally {
      setSubmittingAttendance(false);
    }
  };

  const handleTeacherCheckIn = async (e) => {
    e.preventDefault();
    if (!schoolId || !currentTeacherId) return;

    setSubmittingCheckIn(true);
    try {
      const { error } = await supabase.from('teacher_attendance').insert({
        school_id: schoolId,
        teacher_id: currentTeacherId,
        status_type: teacherStatusType,
        timestamp: new Date().toISOString(),
        hours_worked: 7.5,
        status: 'Pending'
      });

      if (error) throw error;

      alert("Daily check-in submitted successfully for admin review!");
      
      // Refresh history
      const { data: attendanceLogData } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', currentTeacherId)
        .order('timestamp', { ascending: false });

      if (attendanceLogData) {
        setAttendanceHistory(attendanceLogData);
      }
    } catch (err) {
      alert("Error submitting check-in: " + err.message);
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!selectedClass || !assignmentTitle) {
      alert("Please select a class and provide an assignment title.");
      return;
    }

    setCreatingAssignment(true);
    try {
      const { error } = await supabase
        .from('assignments')
        .insert([{
          class_id: selectedClass,
          title: assignmentTitle,
          category: assignmentCategory,
          max_points: parseFloat(assignmentMaxPoints) || 100,
          school_slug: schoolSlug
        }]);

      if (error) throw error;

      alert("Assignment published successfully!");
      setAssignmentTitle('');
    } catch (err) {
      alert("Error creating assignment: " + err.message);
    } finally {
      setCreatingAssignment(false);
    }
  };

  const handleSaveTeacherNote = async (e) => {
    e.preventDefault();
    if (!selectedStudentForNote || !teacherNote.trim()) {
      alert("Please select a student and type a note.");
      return;
    }

    setSavingNote(true);
    try {
      const { error } = await supabase
        .from('student_notes')
        .insert([{
          student_id: selectedStudentForNote,
          note: teacherNote.trim(),
          school_slug: schoolSlug
        }]);

      if (error) throw error;

      alert("Teacher note securely logged for student.");
      setTeacherNote('');
      setSelectedStudentForNote('');
    } catch (err) {
      alert("Error logging student note: " + err.message);
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />

      <nav className="bg-[#111827] border-b border-gray-800 px-6 py-3 flex space-x-6 text-sm font-medium overflow-x-auto">
        <a href="/teacher-dashboard" className="text-indigo-400 border-b-2 border-indigo-400 pb-1">Dashboard</a>
        <a href="/teacher-grading" className="text-gray-400 hover:text-white transition-colors pb-1">Grading Portal</a>
        <a href="/teacher-attendance" className="text-gray-400 hover:text-white transition-colors pb-1">Attendance Hub</a>
        <a href="/teacher-roster" className="text-gray-400 hover:text-white transition-colors pb-1">Class Rosters</a>
      </nav>
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Teacher Portal Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your classroom rosters, submit daily attendance records, and publish assignments.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading teacher classes...</div>
        ) : errorMsg ? (
          <div className="p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-200 text-sm">
            {errorMsg}
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Quick Class Selector Banner */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100 mb-2">Select Active Class Section</h2>
              <p className="text-sm text-gray-400 mb-4">Choose which class you are currently managing for attendance or assignments.</p>
              
              <div className="max-w-md">
                <select 
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                >
                  <option value="" disabled>-- Select Assigned Class --</option>
                  {classes.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name} ({cls.description || 'General Section'})</option>
                  ))}
                </select>
              </div>
            </div>

            {/* TEACHER DAILY ATTENDANCE & PAYROLL CHECK-IN MODULE */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Teacher Daily Attendance & Payroll Check-In</h2>
                <p className="text-sm text-gray-400">Submit your daily check-in status to log hours for administrative review and payroll approval.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Check-In Form */}
                <form onSubmit={handleTeacherCheckIn} className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-4">
                  <h3 className="text-sm font-semibold text-white">Log Today's Status</h3>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Status Type</label>
                    <select
                      value={teacherStatusType}
                      onChange={(e) => setTeacherStatusType(e.target.value)}
                      className="w-full bg-black border border-gray-800 rounded p-2 text-xs text-white"
                    >
                      <option value="Present">Present (Full Day)</option>
                      <option value="Half-Day">Half-Day</option>
                      <option value="Leave">Leave / Absence</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    disabled={submittingCheckIn}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium py-2 rounded text-xs transition"
                  >
                    {submittingCheckIn ? 'Submitting Check-In...' : 'Submit Daily Check-In'}
                  </button>
                </form>

                {/* Personal Check-In History Ledger */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Your Check-In & Payroll Status History</h3>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-400 font-mono">
                          <th className="py-2 px-2">Date / Time</th>
                          <th className="py-2 px-2">Type</th>
                          <th className="py-2 px-2">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-800">
                        {attendanceHistory.length === 0 ? (
                          <tr><td colSpan="3" className="py-4 text-center text-gray-500">No check-in history found.</td></tr>
                        ) : (
                          attendanceHistory.map(record => (
                            <tr key={record.id} className="hover:bg-gray-800/40">
                              <td className="py-2 px-2 text-gray-300">{new Date(record.timestamp).toLocaleString()}</td>
                              <td className="py-2 px-2 text-white font-medium">{record.status_type}</td>
                              <td className="py-2 px-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${record.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                  {record.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            {/* Classes Grid Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {classes.length === 0 ? (
                <p className="text-gray-400 text-sm">No classes currently assigned to your profile.</p>
              ) : (
                classes.map((cls) => (
                  <div key={cls.id} className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-100">{cls.name}</h3>
                    <p className="text-xs text-gray-400 mt-1">{cls.description || 'No description provided.'}</p>
                    <p className="text-xs font-mono text-gray-500 mt-4">Class ID: {cls.id}</p>
                  </div>
                ))
              )}
            </div>

            {/* Two-Column Panel for Attendance & Assignments */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Daily Attendance Submission Box */}
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-100">Submit Daily Attendance</h2>
                <p className="text-sm text-gray-400 mb-4">Record student attendance status for your active section.</p>

                <form onSubmit={handleSaveAttendance} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Attendance Date:</label>
                    <input 
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>

                  <div className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg max-h-60 overflow-y-auto">
                    {!selectedClass ? (
                      <p className="text-xs text-gray-400">Select a class section above to load student roster options for attendance mapping.</p>
                    ) : loadingStudents ? (
                      <p className="text-xs text-gray-400">Loading student roster...</p>
                    ) : classStudents.length === 0 ? (
                      <p className="text-xs text-gray-400">No students found in this school directory.</p>
                    ) : (
                      <div className="space-y-3">
                        {classStudents.map(student => (
                          <div key={student.id} className="flex items-center justify-between bg-black/40 p-2 rounded border border-gray-800">
                            <span className="text-xs font-medium text-white">{student.first_name} {student.last_name}</span>
                            <select
                              value={studentAttendance[student.id] || 'Present'}
                              onChange={(e) => handleAttendanceChange(student.id, e.target.value)}
                              className="bg-gray-900 text-xs text-white border border-gray-700 rounded px-2 py-1"
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Late">Late</option>
                            </select>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button 
                    type="submit" 
                    disabled={submittingAttendance || !selectedClass}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    {submittingAttendance ? 'Saving Attendance...' : 'Submit Attendance Records'}
                  </button>
                </form>
              </div>

              {/* Publish Assignment Box */}
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-100">Publish Class Assignment</h2>
                <p className="text-sm text-gray-400 mb-4">Create a new grading task or homework assignment for the selected class.</p>

                <form onSubmit={handleCreateAssignment} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Assignment Title:</label>
                    <input 
                      type="text"
                      value={assignmentTitle}
                      onChange={(e) => setAssignmentTitle(e.target.value)}
                      placeholder="e.g., Chapter 4 Quiz or Science Project"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-gray-400 mb-1">Category:</label>
                      <select 
                        value={assignmentCategory}
                        onChange={(e) => setAssignmentCategory(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      >
                        <option value="Homework">Homework</option>
                        <option value="Quiz">Quiz</option>
                        <option value="Exam">Exam</option>
                        <option value="Project">Project</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-gray-400 mb-1">Max Points:</label>
                      <input 
                        type="number"
                        value={assignmentMaxPoints}
                        onChange={(e) => setAssignmentMaxPoints(e.target.value)}
                        className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                        required
                      />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={creatingAssignment}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    {creatingAssignment ? 'Publishing...' : 'Publish Assignment'}
                  </button>
                </form>
              </div>

            </div>

          </div>
        )}
      </main>

      {/* Live Alert Popup Notification Banner */}
      {activeNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-gray-900 border border-red-500/50 rounded-xl p-4 shadow-2xl animate-bounce">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold uppercase">
                {activeNotification.is_critical ? '🚨 Critical Teacher Alert' : '📢 School Broadcast'}
              </span>
              <h4 className="text-sm font-semibold text-white mt-1">From: {activeNotification.sender_name}</h4>
              <p className="text-xs text-gray-300 mt-1">{activeNotification.message}</p>
            </div>
            <button 
              onClick={() => setActiveNotification(null)}
              className="text-gray-400 hover:text-white text-xs font-mono ml-4 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}