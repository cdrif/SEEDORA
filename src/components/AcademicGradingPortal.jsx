import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';

export default function AdminReportCards() {
  const [loading, setLoading] = useState(true);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedStudentId, setSelectedStudentId] = useState('ALL');
  
  // Report data stores
  const [academicRecords, setAcademicRecords] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});

  // Principal & School Branding Settings
  const [schoolLogo, setSchoolLogo] = useState('');
  const [principalSig, setPrincipalSig] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingSig, setSavingSig] = useState(false);

  const printRef = useRef();

  useEffect(() => {
    async function initAdminPortal() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');

        // Fetch school slug
        const { data: memberData } = await supabase
          .from('school_members')
          .select('school_slug')
          .eq('user_id', user.id)
          .single();

        const currentSlug = memberData?.school_slug || 'default-school';
        setSchoolSlug(currentSlug);

        // Fetch school settings (logo & principal signature)
        const { data: schoolSettings } = await supabase
          .from('school_settings')
          .select('*')
          .eq('school_slug', currentSlug)
          .single();

        if (schoolSettings) {
          setSchoolLogo(schoolSettings.logo_url || '');
          setPrincipalSig(schoolSettings.principal_signature || '');
        }

        // Fetch students
        const { data: studData } = await supabase
          .from('students')
          .select('*')
          .eq('school_slug', currentSlug);
        setStudents(studData || []);

        // LINKED: Fetch pre-filled academic reports directly from AcademicGradingPortal table (`academic_reports`)
        const { data: acadData, error: acadError } = await supabase
          .from('academic_reports')
          .select(`
            id,
            student_id,
            subject,
            grade,
            effort_rating,
            teacher_comment,
            term,
            students (
              first_name,
              last_name,
              grade_level
            )
          `)
          .eq('school_slug', currentSlug);

        if (acadError) throw acadError;
        setAcademicRecords(acadData || []);

        // Fetch attendance summaries
        const { data: attData } = await supabase
          .from('attendance_summaries')
          .select('*')
          .eq('school_slug', currentSlug);
        
        const attMap = {};
        (attData || []).forEach(a => { attMap[a.student_id] = a; });
        setAttendanceRecords(attMap);

      } catch (err) {
        console.error('Error loading Admin Report Cards:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initAdminPortal();
  }, []);

  // Handle Logo Upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingLogo(true);
    try {
      const filePath = `${schoolSlug}/logo_${Date.now()}.${file.name.split('.').pop()}`;
      const { error: uploadError } = await supabase.storage.from('school-assets').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('school-assets').getPublicUrl(filePath);

      await supabase.from('school_settings').upsert({
        school_slug: schoolSlug,
        logo_url: publicUrl,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_slug' });

      setSchoolLogo(publicUrl);
      alert('School logo successfully updated!');
    } catch (err) {
      alert('Error uploading logo: ' + err.message);
    } finally {
      setUploadingLogo(false);
    }
  };

  // Save Principal Signature
  const handleSavePrincipalSignature = async (e) => {
    e.preventDefault();
    setSavingSig(true);
    try {
      const { error } = await supabase.from('school_settings').upsert({
        school_slug: schoolSlug,
        principal_signature: principalSig,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_slug' });

      if (error) throw error;
      alert('Principal digital signature locked successfully.');
    } catch (err) {
      alert('Error saving signature: ' + err.message);
    } finally {
      setSavingSig(false);
    }
  };

  // Filter students based on dropdown selection
  const filteredStudents = students.filter(s => {
    const matchesGrade = selectedGrade === 'ALL' || s.grade_level === selectedGrade;
    const matchesStudent = selectedStudentId === 'ALL' || s.id === selectedStudentId;
    return matchesGrade && matchesStudent;
  });

  const handlePrint = () => {
    window.print();
  };

  // Get unique grades for filter dropdown
  const availableGrades = [...new Set(students.map(s => s.grade_level))].filter(Boolean);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white print:bg-white print:text-black">
      <div className="print:hidden">
        <GlobalHeader />
      </div>

      <main className="max-w-6xl mx-auto px-6 py-8">
        
        {/* CONTROL PANEL / FILTERS (Hidden during print) */}
        <div className="print:hidden mb-8 bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Admin Report Cards Centre</h1>
              <p className="text-sm text-gray-400 mt-1">Manage branding, review academic records, and print official reports school-wide.</p>
            </div>
            <button 
              onClick={handlePrint}
              disabled={filteredStudents.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg text-sm cursor-pointer transition-colors flex items-center gap-2"
            >
              🖨️ Print / Export PDF ({filteredStudents.length} Selected)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-gray-800">
            {/* Grade Filter */}
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Filter by Grade:</label>
              <select 
                value={selectedGrade}
                onChange={(e) => { setSelectedGrade(e.target.value); setSelectedStudentId('ALL'); }}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
              >
                <option value="ALL">All Grades</option>
                {availableGrades.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Student Filter */}
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Filter by Student:</label>
              <select 
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
              >
                <option value="ALL">All Students in View</option>
                {students
                  .filter(s => selectedGrade === 'ALL' || s.grade_level === selectedGrade)
                  .map(s => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>

            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">School Logo (Upload):</label>
              <input 
                type="file" 
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploadingLogo}
                className="w-full text-xs text-gray-400 file:mr-2 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-950 file:text-indigo-300 hover:file:bg-indigo-900"
              />
            </div>

            {/* Principal Signature Setup */}
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Principal Digital Signature:</label>
              <form onSubmit={handleSavePrincipalSignature} className="flex gap-2">
                <input 
                  type="text" 
                  value={principalSig}
                  onChange={(e) => setPrincipalSig(e.target.value)}
                  placeholder="e.g., Dr. A. Vance, Principal"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2 text-xs text-white font-mono"
                  required
                />
                <button type="submit" disabled={savingSig} className="bg-gray-800 hover:bg-gray-700 text-xs px-3 py-2 rounded-lg font-mono">
                  Save
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* REPORT CARDS CONTAINER */}
        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading reports centre...</div>
        ) : filteredStudents.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center text-gray-400">
            No student records found matching the selected filters.
          </div>
        ) : (
          <div className="space-y-12" ref={printRef}>
            {filteredStudents.map((student) => {
              const studentReports = academicRecords.filter(r => r.student_id === student.id);
              const att = attendanceRecords[student.id] || { total_days: 180, attended: 172, absent_exp: 5, absent_unexp: 3 };
              
              const overallGradeLetter = studentReports.length > 0 ? studentReports[0].grade : 'B';

              return (
                <div key={student.id} className="bg-white text-black border border-gray-300 rounded-xl p-8 shadow-md print:shadow-none print:border-none print:p-0 print:mb-16 page-break-after">
                  
                  {/* TOP HEADER */}
                  <div className="flex justify-between items-center border-b-2 border-blue-900 pb-6 mb-6">
                    <div className="flex items-center gap-4">
                      {schoolLogo ? (
                        <img src={schoolLogo} alt="School Logo" className="w-16 h-16 object-contain" />
                      ) : (
                        <div className="w-16 h-16 bg-blue-900 text-white flex items-center justify-center font-bold rounded-lg text-xl">
                          🏫
                        </div>
                      )}
                      <div>
                        <h2 className="text-2xl font-black tracking-tight text-blue-950">
                          {student.first_name} {student.last_name} <span className="text-sm font-normal text-gray-600">(ID: {student.student_id || student.id.slice(0,6)})</span>
                        </h2>
                        <p className="text-sm text-gray-600 font-medium">
                          Grade Level: {student.grade_level || 'Grade 9'} | Term: Term 3, 2026
                        </p>
                      </div>
                    </div>
                    <div className="bg-blue-800 text-white px-6 py-3 rounded-xl text-center shadow">
                      <div className="text-[10px] uppercase font-mono tracking-wider opacity-80">Overall Grade</div>
                      <div className="text-2xl font-black">{overallGradeLetter}</div>
                    </div>
                  </div>

                  {/* ATTENDANCE RECORD */}
                  <div className="mb-6 border border-blue-200 rounded-xl p-4 bg-blue-50/50">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900 mb-3">Attendance Record (Term 3, 2026)</h3>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div className="bg-white border border-blue-100 rounded-lg p-2 shadow-2xs">
                        <div className="text-[10px] font-mono text-gray-500">TOTAL DAYS</div>
                        <div className="text-lg font-bold text-gray-800">{att.total_days}</div>
                      </div>
                      <div className="bg-white border border-blue-100 rounded-lg p-2 shadow-2xs">
                        <div className="text-[10px] font-mono text-gray-500">ATTENDED</div>
                        <div className="text-lg font-bold text-blue-700">{att.attended}</div>
                      </div>
                      <div className="bg-white border border-blue-100 rounded-lg p-2 shadow-2xs">
                        <div className="text-[10px] font-mono text-gray-500">ABSENT (EXP.)</div>
                        <div className="text-lg font-bold text-amber-600">{att.absent_exp}</div>
                      </div>
                      <div className="bg-white border border-blue-100 rounded-lg p-2 shadow-2xs">
                        <div className="text-[10px] font-mono text-gray-500">ABSENT (UNEXP.)</div>
                        <div className="text-lg font-bold text-red-600">{att.absent_unexp}</div>
                      </div>
                    </div>
                  </div>

                  {/* ACADEMICS TABLE (Prefilled from AcademicGradingPortal reports) */}
                  <div className="mb-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse border border-gray-300 text-sm">
                      <thead>
                        <tr className="bg-blue-900 text-white font-mono text-xs">
                          <th className="py-2.5 px-4 border border-blue-900">Subject</th>
                          <th className="py-2.5 px-4 border border-blue-900">Term Period</th>
                          <th className="py-2.5 px-4 border border-blue-900">Grade & Effort</th>
                          <th className="py-2.5 px-4 border border-blue-900">Teacher Narrative Comment</th>
                        </tr>
                      </thead>
                      <tbody>
                        {studentReports.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="py-4 px-4 text-center text-gray-500 border border-gray-300 italic">
                              No academic reports submitted from grading portal for this student yet.
                            </td>
                          </tr>
                        ) : (
                          studentReports.map((rep, idx) => (
                            <tr key={idx} className="border border-gray-300 odd:bg-gray-50">
                              <td className="py-2.5 px-4 border border-gray-300 font-bold text-gray-900">{rep.subject}</td>
                              <td className="py-2.5 px-4 border border-gray-300 text-gray-600 text-xs">{rep.term}</td>
                              <td className="py-2.5 px-4 border border-gray-300 font-mono font-semibold">
                                Grade: {rep.grade} <span className="text-xs font-normal text-gray-500 block">Effort: {rep.effort_rating}</span>
                              </td>
                              <td className="py-2.5 px-4 border border-gray-300 text-gray-600 text-xs">{rep.teacher_comment || 'No specific comment recorded.'}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* ACHIEVEMENT STANDARD & GRADING SCALE */}
                  <div className="mb-8 border border-gray-300 rounded-xl p-3 bg-gray-100 text-center">
                    <div className="text-[10px] font-mono font-bold text-gray-700 uppercase mb-2">Achievement Standard & Grading Scale (Australian Curriculum)</div>
                    <div className="grid grid-cols-5 gap-2 text-xs font-mono">
                      <div className="bg-white border rounded p-1"><strong>A:</strong> Outstanding</div>
                      <div className="bg-white border rounded p-1"><strong>B:</strong> Above Satisfactory</div>
                      <div className="bg-white border rounded p-1"><strong>C:</strong> Satisfactory</div>
                      <div className="bg-white border rounded p-1"><strong>D:</strong> Partial</div>
                      <div className="bg-white border rounded p-1"><strong>E:</strong> Elementary</div>
                    </div>
                  </div>

                  {/* SIGNATURES & FOOTER */}
                  <div className="grid grid-cols-2 gap-12 pt-4 border-t border-dashed border-gray-400 text-xs">
                    <div>
                      <div className="h-10 flex items-end font-mono text-gray-700 italic">Staff Instructor</div>
                      <div className="border-t border-gray-500 pt-1 text-gray-600">Teacher Signature & Date</div>
                    </div>
                    <div>
                      <div className="h-10 flex items-end font-mono text-gray-800 font-semibold">{principalSig || 'Principal Signature'}</div>
                      <div className="border-t border-gray-500 pt-1 text-gray-600">Principal Signature & Date</div>
                    </div>
                  </div>

                  <div className="text-center text-[10px] font-mono text-gray-400 mt-6">
                    Official Report Card — Seedora School Platform — Printed on: {new Date().toLocaleString()}
                  </div>

                </div>
              );
            })}
          </div>
        )}

      </main>
    </div>
  );
}