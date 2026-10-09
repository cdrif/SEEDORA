import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';

export default function TeachBHE() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [students, setStudents] = useState([]);
  const [behaviorLogs, setBehaviorLogs] = useState([]);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [severity, setSeverity] = useState('minor');
  const [description, setDescription] = useState('');
  const [actionTaken, setActionTaken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function initTeacherBHE() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');
        setUserId(user.id);

        const { data: memberData } = await supabase
          .from('school_members')
          .select('school_slug')
          .eq('user_id', user.id)
          .single();

        const currentSlug = memberData?.school_slug || 'default-school';
        setSchoolSlug(currentSlug);

        // Fetch students directory
        const { data: studData } = await supabase
          .from('students')
          .select('id, first_name, last_name, grade_level')
          .eq('school_slug', currentSlug);
        setStudents(studData || []);

        // Fetch historical behavior logs for the school
        const { data: logData } = await supabase
          .from('student_behaviors')
          .select('*, students(first_name, last_name)')
          .eq('school_slug', currentSlug)
          .order('created_at', { ascending: false });
        setBehaviorLogs(logData || []);

      } catch (err) {
        console.error('Error loading behavior portal:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initTeacherBHE();
  }, []);

  const handleAddBehavior = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !description) {
      alert('Please select a student and provide a behavior description.');
      return;
    }

    setSubmitting(true);
    const isSevere = severity === 'severe';

    try {
      const { error } = await supabase
        .from('student_behaviors')
        .insert([{
          school_slug: schoolSlug,
          student_id: selectedStudent,
          teacher_id: userId,
          severity,
          description,
          action_taken: actionTaken,
          admin_notified: isSevere,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      alert(isSevere ? 'Severe behavior logged! Principal/Admin has been alerted.' : 'Behavior record saved successfully.');
      setSelectedStudent('');
      setDescription('');
      setActionTaken('');
      setSeverity('minor');
      window.location.reload();
    } catch (err) {
      alert('Error saving behavior entry: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Teacher Behavior & Incident Portal</h1>
          <p className="text-sm text-gray-400 mt-1">
            Log student behavioral notes, track disciplinary history, and trigger automatic admin escalations for severe actions.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading behavior logs...</div>
        ) : (
          <div className="space-y-10">
            {/* Form Box */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100 mb-1">Log Student Behavior Entry</h2>
              <p className="text-sm text-gray-400 mb-4">Entries are historically recorded and securely isolated by school tenant.</p>

              <form onSubmit={handleAddBehavior} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Select Student:</label>
                    <select 
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    >
                      <option value="" disabled>Choose student...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} ({s.grade_level || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Severity Level:</label>
                    <select 
                      value={severity}
                      onChange={(e) => setSeverity(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    >
                      <option value="minor">Minor (Classroom disruption)</option>
                      <option value="moderate">Moderate (Repeated warnings)</option>
                      <option value="severe">Severe (Escalate to Principal/Admin)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Behavior Description / Incident Details:</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what occurred..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-white h-24 resize-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Action Taken / Resolution:</label>
                  <input 
                    type="text"
                    value={actionTaken}
                    onChange={(e) => setActionTaken(e.target.value)}
                    placeholder="e.g., Verbal warning given, parent contacted..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                  />
                </div>

                {severity === 'severe' && (
                  <div className="bg-red-950/40 border border-red-900/60 p-3 rounded-lg text-xs font-mono text-red-300">
                    ⚠️ Warning: Selecting 'Severe' will flag this entry for immediate Principal and Admin review notification.
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg text-sm cursor-pointer transition-colors"
                >
                  {submitting ? 'Saving Record...' : 'Save & Historic Log Entry'}
                </button>
              </form>
            </div>

            {/* Historical Table */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-100">Historical Behavior Archive</h3>
                <span className="text-xs font-mono text-gray-400 bg-gray-900 px-3 py-1 rounded border border-gray-800">
                  Total Records: {behaviorLogs.length}
                </span>
              </div>

              {behaviorLogs.length === 0 ? (
                <div className="p-6 text-gray-400 text-sm">No behavioral incident logs found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/50 font-mono text-xs">
                        <th className="py-3 px-6">Timestamp (UTC)</th>
                        <th className="py-3 px-6">Student</th>
                        <th className="py-3 px-6">Severity</th>
                        <th className="py-3 px-6">Description</th>
                        <th className="py-3 px-6">Admin Alert</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                      {behaviorLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-900/30 transition-colors">
                          <td className="py-3 px-6 text-gray-300">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-gray-200 font-sans font-medium">
                            {log.students ? `${log.students.first_name} ${log.students.last_name}` : 'Student'}
                          </td>
                          <td className="py-3 px-6">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                              log.severity === 'severe' ? 'bg-red-950 text-red-400 border border-red-800' :
                              log.severity === 'moderate' ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' :
                              'bg-gray-800 text-gray-300'
                            }`}>
                              {log.severity}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-gray-300 max-w-xs truncate">
                            {log.description}
                          </td>
                          <td className="py-3 px-6">
                            {log.admin_notified ? (
                              <span className="text-red-400 font-bold">Notified 🚨</span>
                            ) : (
                              <span className="text-gray-500">Standard</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}