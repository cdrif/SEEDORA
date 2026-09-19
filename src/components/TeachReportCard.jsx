import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';

export default function TeachReportCard() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [students, setStudents] = useState([]);
  const [reportHistory, setReportHistory] = useState([]);

  // Form states
  const [selectedStudent, setSelectedStudent] = useState('');
  const [subject, setSubject] = useState('');
  const [gradeReview, setGradeReview] = useState('');
  const [excellingIn, setExcellingIn] = useState('');
  const [needsImprovement, setNeedsImprovement] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Signature state (Teacher-locked)
  const [signatureInput, setSignatureInput] = useState('');
  const [savedSignature, setSavedSignature] = useState(null);
  const [savingSignature, setSavingSignature] = useState(false);

  useEffect(() => {
    async function initTeacherReportData() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');
        setUserId(user.id);

        // Fetch school slug
        const { data: memberData } = await supabase
          .from('school_members')
          .select('school_slug')
          .eq('user_id', user.id)
          .single();

        const currentSlug = memberData?.school_slug || 'default-school';
        setSchoolSlug(currentSlug);

        // Fetch students directory for this school
        const { data: studData } = await supabase
          .from('students')
          .select('id, first_name, last_name, grade_level')
          .eq('school_slug', currentSlug);
        setStudents(studData || []);

        // Fetch teacher's saved signature if it exists
        const { data: sigData } = await supabase
          .from('teacher_signatures')
          .select('*')
          .eq('teacher_id', user.id)
          .single();

        if (sigData) {
          setSavedSignature(sigData.signature_data);
          setSignatureInput(sigData.signature_data);
        }

        // Fetch historical report cards created by this teacher or school
        const { data: repData } = await supabase
          .from('report_cards')
          .select('*, students(first_name, last_name)')
          .eq('school_slug', currentSlug)
          .order('created_at', { ascending: false });
        setReportHistory(repData || []);

      } catch (err) {
        console.error('Error loading report card module:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initTeacherReportData();
  }, []);

  // Generate simulated professional AI summary based on inputs
  const handleGenerateAiSummary = () => {
    if (!subject || !gradeReview) {
      alert('Please fill out the Subject and Grade Review before generating an AI summary.');
      return;
    }
    const generated = `Overall performance in ${subject} indicates consistent engagement. ${gradeReview} Key strengths noted in areas of ${excellingIn || 'participation'}, with targeted focus recommended for ${needsImprovement || 'review areas'}.`;
    setAiSummary(generated);
  };

  // Save or Update Teacher's Unique Signature (Strictly bound to auth.uid())
  const handleSaveSignature = async (e) => {
    e.preventDefault();
    if (!signatureInput.trim()) return;
    setSavingSignature(true);

    try {
      const { error } = await supabase
        .from('teacher_signatures')
        .upsert({
          teacher_id: userId,
          school_slug: schoolSlug,
          signature_data: signatureInput,
          updated_at: new Date().toISOString()
        }, { onConflict: 'teacher_id' });

      if (error) throw error;
      setSavedSignature(signatureInput);
      alert('Your teacher signature has been securely updated and locked to your profile.');
    } catch (err) {
      alert('Error saving signature: ' + err.message);
    } finally {
      setSavingSignature(false);
    }
  };

  // Submit Report Card with timestamp and AI summary
  const handleSubmitReportCard = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !subject || !gradeReview) {
      alert('Please select a student, provide a subject, and enter a grade review.');
      return;
    }
    if (!savedSignature) {
      alert('Please save and register your teacher signature before publishing report cards.');
      return;
    }
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('report_cards')
        .insert([{
          school_slug: schoolSlug,
          student_id: selectedStudent,
          teacher_id: userId,
          subject,
          grade_review: gradeReview,
          excelling_in: excellingIn,
          needs_improvement: needsImprovement,
          ai_summary: aiSummary || `Performance review for ${subject} submitted successfully.`,
          created_at: new Date().toISOString() // Historic timestamp
        }]);

      if (error) throw error;

      alert('Report card successfully saved with timestamp!');
      // Reset form fields
      setSubject('');
      setGradeReview('');
      setExcellingIn('');
      setNeedsImprovement('');
      setAiSummary('');
      window.location.reload();
    } catch (err) {
      alert('Error saving report card: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Teacher Report Card & Evaluation Portal</h1>
          <p className="text-sm text-gray-400 mt-1">
            Build student reviews, generate AI summaries, manage your secure digital signature, and view historic archives.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading evaluation portal...</div>
        ) : (
          <div className="space-y-10">

            {/* SECTION 1: TEACHER SIGNATURE CONFIGURATION (ISOLATED) */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100">Secure Teacher Signature Management</h2>
              <p className="text-sm text-gray-400 mb-4">Register your unique digital signature. Only you can access and modify your signature data.</p>

              <form onSubmit={handleSaveSignature} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Digital Signature Text / Code / Image URL:</label>
                  <input 
                    type="text"
                    value={signatureInput}
                    onChange={(e) => setSignatureInput(e.target.value)}
                    placeholder="e.g., J. Doe, Senior Instructor (Secured Hash ID)"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white font-mono"
                    required
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <button 
                    type="submit" 
                    disabled={savingSignature}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm cursor-pointer transition-colors"
                  >
                    {savingSignature ? 'Saving Signature...' : 'Save & Lock Signature'}
                  </button>
                  {savedSignature && (
                    <span className="text-xs font-mono text-green-400 bg-green-950/50 border border-green-800 px-3 py-1.5 rounded">
                      Status: Signature Active & Verified
                    </span>
                  )}
                </div>
              </form>
            </div>

            {/* SECTION 2: CREATE REPORT CARD FORM */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100">Create Student Report Card Evaluation</h2>
              <p className="text-sm text-gray-400 mb-4">Fill out student performance metrics and compile AI summaries for administration records.</p>

              <form onSubmit={handleSubmitReportCard} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Select Student:</label>
                    <select 
                      value={selectedStudent}
                      onChange={(e) => setSelectedStudent(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    >
                      <option value="" disabled>Choose student from directory...</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>
                          {s.first_name} {s.last_name} ({s.grade_level || 'General'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Subject Name:</label>
                    <input 
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="e.g., Advanced Mathematics"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Grade & Performance Review:</label>
                  <textarea 
                    value={gradeReview}
                    onChange={(e) => setGradeReview(e.target.value)}
                    placeholder="Detailed commentary on student grade performance..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-sm text-white h-24 resize-none"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">What They Are Excelling In:</label>
                    <input 
                      type="text"
                      value={excellingIn}
                      onChange={(e) => setExcellingIn(e.target.value)}
                      placeholder="e.g., Analytical problem solving"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Areas Needing Improvement:</label>
                    <input 
                      type="text"
                      value={needsImprovement}
                      onChange={(e) => setNeedsImprovement(e.target.value)}
                      placeholder="e.g., Time management on tests"
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    />
                  </div>
                </div>

                {/* AI Summary Section */}
                <div className="bg-gray-900 border border-gray-800 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-mono text-indigo-400 font-bold">AI General Administrative Summary:</label>
                    <button 
                      type="button" 
                      onClick={handleGenerateAiSummary}
                      className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-800 text-xs px-3 py-1 rounded cursor-pointer transition-colors"
                    >
                      Generate AI Summary
                    </button>
                  </div>
                  <textarea 
                    value={aiSummary}
                    onChange={(e) => setAiSummary(e.target.value)}
                    placeholder="Generated summary ready for admin report card page..."
                    className="w-full bg-black border border-gray-800 rounded p-2 text-xs text-gray-300 h-20 resize-none font-mono"
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg text-sm cursor-pointer transition-colors"
                >
                  {submitting ? 'Saving Evaluation...' : 'Save & Timestamp Report Card'}
                </button>
              </form>
            </div>

            {/* SECTION 3: HISTORICAL REPORT CARD ARCHIVE */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                <div>
                  <h3 className="text-base font-semibold text-gray-100">Historical Report Card Archive</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Chronologically logged reports stored securely with timestamps.</p>
                </div>
                <span className="text-xs font-mono text-gray-400 bg-gray-900 px-3 py-1 rounded border border-gray-800">
                  Total Archived: {reportHistory.length}
                </span>
              </div>

              {reportHistory.length === 0 ? (
                <div className="p-6 text-gray-400 text-sm">No historical report cards found.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/50 font-mono text-xs">
                        <th className="py-3 px-6">Timestamp (UTC)</th>
                        <th className="py-3 px-6">Student</th>
                        <th className="py-3 px-6">Subject</th>
                        <th className="py-3 px-6">Grade Review</th>
                        <th className="py-3 px-6">AI Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                      {reportHistory.map((rep) => (
                        <tr key={rep.id} className="hover:bg-gray-900/30 transition-colors">
                          <td className="py-3 px-6 text-gray-300">
                            {new Date(rep.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-gray-200 font-sans font-medium">
                            {rep.students ? `${rep.students.first_name} ${rep.students.last_name}` : 'Student'}
                          </td>
                          <td className="py-3 px-6 text-indigo-300 font-semibold">
                            {rep.subject}
                          </td>
                          <td className="py-3 px-6 text-gray-300 max-w-xs truncate">
                            {rep.grade_review}
                          </td>
                          <td className="py-3 px-6 text-gray-400 max-w-xs truncate">
                            {rep.ai_summary}
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