import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // Adjust path to your client as needed

export default function AttendanceHub({ schoolSlug, userRole }) {
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStudentsAndAttendance();
  }, [selectedDate, schoolSlug]);

  const fetchStudentsAndAttendance = async () => {
    setLoading(true);
    // 1. Fetch students for this school
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*')
      .eq('school_slug', schoolSlug);

    if (studentError) {
      console.error('Error fetching students:', studentError);
      setLoading(false);
      return;
    }

    // 2. Fetch existing attendance records for the selected date
    const { data: attData, error: attError } = await supabase
      .from('student_attendance')
      .select('*')
      .eq('school_slug', schoolSlug)
      .eq('date', selectedDate);

    if (attError) console.error('Error fetching attendance:', attError);

    // Map attendance into a convenient lookup state { student_id: status }
    const attMap = {};
    (attData || []).forEach(record => {
      attMap[record.student_id] = record.status;
    });

    setStudents(studentData || []);
    setAttendance(attMap);
    setLoading(false);
  };

  const handleStatusChange = (studentId, status) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const saveAttendance = async () => {
    setSaving(true);
    const records = students.map(student => ({
      school_slug: schoolSlug,
      student_id: student.id,
      date: selectedDate,
      status: attendance[student.id] || 'Present', // Default to Present if untouched
    }));

    // Upsert to handle updates if records for this date already exist
    const { error } = await supabase
      .from('student_attendance')
      .upsert(records, { onConflict: 'student_id,date' });

    setSaving(false);
    if (error) {
      alert('Error saving attendance: ' + error.message);
    } else {
      alert('Attendance saved successfully!');
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-100 shadow-2xl">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-wide text-indigo-400">Daily Attendance Register</h2>
          <p className="text-sm text-slate-400">Mark student attendance and track daily compliance.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-slate-800 border border-slate-700 px-3 py-2 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          {userRole !== 'parent' && (
            <button 
              onClick={saveAttendance}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition shadow-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Roll'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">Loading student rolls...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-xs text-slate-400 uppercase">
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Student ID</th>
                <th className="py-3 px-4">Grade</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {students.map(student => {
                const currentStatus = attendance[student.id] || 'Present';
                return (
                  <tr key={student.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-medium text-slate-200">{student.first_name} {student.last_name}</td>
                    <td className="py-3 px-4 text-slate-400 font-mono text-xs">{student.student_id_number}</td>
                    <td className="py-3 px-4 text-slate-300">{student.grade_level}</td>
                    <td className="py-3 px-4">
                      <select 
                        value={currentStatus}
                        disabled={userRole === 'parent'}
                        onChange={(e) => handleStatusChange(student.id, e.target.value)}
                        className={`bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs font-medium focus:outline-none ${
                          currentStatus === 'Present' ? 'text-emerald-400' : 
                          currentStatus.includes('Absence') ? 'text-rose-400' : 'text-amber-400'
                        }`}
                      >
                        <option value="Present">Present</option>
                        <option value="Unexcused Absence">Unexcused Absence</option>
                        <option value="Excused Absence">Excused Absence</option>
                        <option value="Late">Late</option>
                        <option value="Sick">Sick</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan="4" className="text-center py-8 text-slate-500">No students registered under this school slug.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}