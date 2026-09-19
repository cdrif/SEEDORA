import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';

export default function TeachHomeWork() {
  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [userId, setUserId] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);

  // States for Assignment Creation
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [gradeLevel, setGradeLevel] = useState('Grade 9');
  const [dueDate, setDueDate] = useState('');
  const [creating, setCreating] = useState(false);

  // States for Grading
  const [gradingId, setGradingId] = useState(null);
  const [assignedGrade, setAssignedGrade] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    async function fetchTeacherData() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');
        setUserId(user.id);

        const { data: memberData } = await supabase
          .from('school_members')
          .select('school_slug')
          .eq('user_id', user.id)
          .single();

        if (memberData) setSchoolSlug(memberData.school_slug);

        // Fetch assignments
        const { data: assignData } = await supabase
          .from('homework_assignments')
          .select('*')
          .order('due_date', { ascending: true });
        setAssignments(assignData || []);

        // Fetch submissions with student and assignment details
        const { data: subData } = await supabase
          .from('homework_submissions')
          .select('*, students(first_name, last_name, grade_level), homework_assignments(title)');
        setSubmissions(subData || []);

      } catch (err) {
        console.error('Error loading teacher homework:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchTeacherData();
  }, []);

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!title || !dueDate || !gradeLevel) return;
    setCreating(true);

    try {
      const { error } = await supabase
        .from('homework_assignments')
        .insert([{
          school_slug: schoolSlug,
          title,
          description,
          grade_level: gradeLevel,
          due_date: new Date(dueDate).toISOString(),
          created_by: userId
        }]);

      if (error) throw error;
      alert('Assignment published successfully!');
      setTitle('');
      setDescription('');
      setDueDate('');
      window.location.reload();
    } catch (err) {
      alert('Error creating assignment: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSaveGrade = async (submissionId) => {
    try {
      const { error } = await supabase
        .from('homework_submissions')
        .update({
          grade: assignedGrade,
          feedback: feedback,
          status: 'graded'
        })
        .eq('id', submissionId);

      if (error) throw error;
      alert('Grade saved successfully!');
      setGradingId(null);
      window.location.reload();
    } catch (err) {
      alert('Error updating grade: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Teacher Homework & Grading Portal</h1>
          <p className="text-sm text-gray-400 mt-1">Publish coursework and review student submissions.</p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading portal...</div>
        ) : (
          <div className="space-y-10">
            {/* Create Assignment Form */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100 mb-4">Create Homework Assignment</h2>
              <form onSubmit={handleCreateAssignment} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Title:</label>
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Grade Level:</label>
                    <select 
                      value={gradeLevel}
                      onChange={(e) => setGradeLevel(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    >
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Due Date:</label>
                    <input 
                      type="datetime-local"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Description:</label>
                  <textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-white h-24 resize-none"
                  />
                </div>
                <button type="submit" disabled={creating} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm cursor-pointer">
                  {creating ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </form>
            </div>

            {/* Submissions Review Table */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-800">
                <h3 className="text-base font-semibold text-gray-100">Student Submissions & Grading</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/50 font-mono text-xs">
                      <th className="py-3 px-6">Assignment</th>
                      <th className="py-3 px-6">Student</th>
                      <th className="py-3 px-6">Response</th>
                      <th className="py-3 px-6">Status</th>
                      <th className="py-3 px-6">Grade / Feedback</th>
                      <th className="py-3 px-6">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-xs font-mono">
                    {submissions.map((sub) => {
                      const isGrading = gradingId === sub.id;
                      return (
                        <tr key={sub.id} className="hover:bg-gray-900/30">
                          <td className="py-3 px-6 text-indigo-300 font-semibold">{sub.homework_assignments?.title}</td>
                          <td className="py-3 px-6 text-gray-200">{sub.students?.first_name} {sub.students?.last_name}</td>
                          <td className="py-3 px-6 text-gray-300 max-w-xs truncate">{sub.submission_text}</td>
                          <td className="py-3 px-6">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${sub.status === 'graded' ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                              {sub.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="py-3 px-6 text-gray-300">
                            {isGrading ? (
                              <div className="space-y-1">
                                <input type="text" placeholder="Grade (e.g. A)" value={assignedGrade} onChange={(e) => setAssignedGrade(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-1 text-white" />
                                <input type="text" placeholder="Feedback" value={feedback} onChange={(e) => setFeedback(e.target.value)} className="w-full bg-black border border-gray-700 rounded p-1 text-white" />
                              </div>
                            ) : (
                              <div>{sub.grade ? `${sub.grade} - ${sub.feedback}` : 'Pending Grade'}</div>
                            )}
                          </td>
                          <td className="py-3 px-6">
                            {isGrading ? (
                              <button onClick={() => handleSaveGrade(sub.id)} className="bg-green-600 px-2.5 py-1 rounded text-xs cursor-pointer">Save</button>
                            ) : (
                              <button onClick={() => { setGradingId(sub.id); setAssignedGrade(sub.grade || ''); setFeedback(sub.feedback || ''); }} className="bg-indigo-600 px-3 py-1 rounded text-xs cursor-pointer">Grade</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
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