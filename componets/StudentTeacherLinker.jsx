import { useState } from 'react';
import { supabase } from '../lib/supabaseClient'; // Adjust to your Supabase client path

export default function StudentTeacherLinker({ students, teachers, currentAdmin }) {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleSaveLink = async () => {
    if (!selectedStudent || !selectedTeacher) {
      setMessage({ type: 'error', text: 'Please select both a student and a teacher.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      // 1. Insert the student-teacher relationship into your mapping table
      const { error: linkError } = await supabase
        .from('student_teacher_links')
        .insert([
          { student_id: selectedStudent, teacher_id: selectedTeacher }
        ]);

      if (linkError) throw linkError;

      // 2. Log the approval and association in the audit log table
      const { error: auditError } = await supabase
        .from('audit_logs')
        .insert([
          {
            action: 'MANUAL_STUDENT_TEACHER_LINK',
            approved_by: currentAdmin?.id || 'system_admin',
            approver_email: currentAdmin?.email || 'unknown',
            details: `Manually linked student ID: ${selectedStudent} to teacher ID: ${selectedTeacher}`,
            created_at: new Date().toISOString()
          }
        ]);

      if (auditError) throw auditError;

      setMessage({ 
        type: 'success', 
        text: 'Student-teacher link saved successfully and recorded in the audit log!' 
      });
      setSelectedStudent('');
      setSelectedTeacher('');
    } catch (err) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 text-slate-200 shadow-xl">
      <h3 className="text-lg font-semibold mb-4 text-emerald-400">Manual Student-Teacher Linking</h3>
      
      {message && (
        <div className={`p-3 mb-4 rounded text-sm ${
          message.type === 'error' 
            ? 'bg-red-950/60 text-red-300 border border-red-800' 
            : 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Select Student</label>
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Choose Student --</option>
            {students?.map(s => (
              <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Select Teacher</label>
          <select
            value={selectedTeacher}
            onChange={(e) => setSelectedTeacher(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-emerald-500"
          >
            <option value="">-- Choose Teacher --</option>
            {teachers?.map(t => (
              <option key={t.id} value={t.id}>{t.name} ({t.email})</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleSaveLink}
        disabled={loading}
        className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 rounded transition-colors disabled:opacity-50 shadow-md"
      >
        {loading ? 'Saving Link...' : 'Save Link & Log Approval'}
      </button>
    </div>
  );
}