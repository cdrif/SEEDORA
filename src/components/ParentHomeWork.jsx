import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';

export default function ParentHomeWork() {
  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [mySubmissions, setMySubmissions] = useState([]);

  // Form states
  const [selectedAssignment, setSelectedAssignment] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [submissionText, setSubmissionText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchParentData() {
      try {
        // Fetch active assignments
        const { data: assignData } = await supabase
          .from('homework_assignments')
          .select('*')
          .order('due_date', { ascending: true });
        setAssignments(assignData || []);

        // Fetch students list (linked to parent view)
        const { data: studData } = await supabase
          .from('students')
          .select('id, first_name, last_name, grade_level');
        setStudents(studData || []);

        // Fetch submissions history
        const { data: subData } = await supabase
          .from('homework_submissions')
          .select('*, students(first_name, last_name), homework_assignments(title, due_date)');
        setMySubmissions(subData || []);

      } catch (err) {
        console.error('Error loading parent homework:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchParentData();
  }, []);

  const handleSubmitHomework = async (e) => {
    e.preventDefault();
    if (!selectedAssignment || !selectedStudent || !submissionText) {
      alert('Please fill out all fields.');
      return;
    }
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('homework_submissions')
        .insert([{
          assignment_id: selectedAssignment,
          student_id: selectedStudent,
          submission_text: submissionText,
          status: 'submitted'
        }]);

      if (error) throw error;
      alert('Homework submitted successfully!');
      setSubmissionText('');
      window.location.reload();
    } catch (err) {
      alert('Error submitting homework: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Parent & Student Homework Portal</h1>
          <p className="text-sm text-gray-400 mt-1">View homework assignments, submit coursework responses, and check teacher grades.</p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading portal...</div>
        ) : (
          <div className="space-y-10">
            {/* Submit Homework Form */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Submit Assignment Work</h2>
              <form onSubmit={handleSubmitHomework} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Select Assignment:</label>
                  <select 
                    value={selectedAssignment}
                    onChange={(e) => setSelectedAssignment(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  >
                    <option value="" disabled>Choose assignment...</option>
                    {assignments.map(a => (
                      <option key={a.id} value={a.id}>{a.title} (Due: {new Date(a.due_date).toLocaleDateString()})</option>
                    ))}
                  </select>
                </div>
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
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.grade_level})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Submission Response Text:</label>
                  <textarea 
                    value={submissionText}
                    onChange={(e) => setSubmissionText(e.target.value)}
                    placeholder="Paste your answers or notes here..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-white h-28 resize-none"
                    required
                  />
                </div>
                <button type="submit" disabled={submitting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm cursor-pointer">
                  {submitting ? 'Submitting...' : 'Submit Work'}
                </button>
              </form>
            </div>

            {/* Submissions & Grades Status */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-base font-semibold text-gray-100">Submission Status & Teacher Feedback</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/50 font-mono text-xs">
                      <th className="py-3 px-6">Assignment</th>
                      <th className="py-3 px-6">Student</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Grade</th>
                      <th className="py-3 px-6">Feedback</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-xs font-mono">
                    {mySubmissions.map((sub) => (
                      <tr key={sub.id} className="hover:bg-gray-900/35">
                        <td className="py-3 px-6 text-indigo-300 font-semibold">{sub.homework_assignments?.title}</td>
                        <td className="py-3 px-6 text-gray-200">{sub.students?.first_name} {sub.students?.last_name}</td>
                        <td className="py-3 px-6">
                          <span className={`px-2 py-1 rounded text-[10px] font-bold ${sub.status === 'graded' ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                            {sub.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-gray-200">{sub.grade || '—'}</td>
                        <td className="py-3 px-6 text-gray-400">{sub.feedback || 'Awaiting evaluation'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}