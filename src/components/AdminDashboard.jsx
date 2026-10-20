import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';
import AttendanceHub from './AttendanceHub';
import AcademicGradingPortal from './AcademicGradingPortal';

// Import your 3 split modular files
import PayrollLedger from './PayrollLedger';
import BroadcastPanel from './BroadcastPanel';
import { 
  TeacherProvisioningPanel, 
  TeacherInvitePanel, 
  DataIngestionPanel, 
  StudentTeacherLinkPanel, 
  ReportCardsPanel 
} from './AdminForms';

// Helper to play custom uploaded audio files
function playNotificationSound(isCritical = false) {
  try {
    const audioPath = isCritical 
      ? '/sounds/tithuh-warning-545568.mp3' 
      : '/sounds/liecio-message-alert-190042.mp3';
      
    const audio = new Audio(audioPath);
    audio.play().catch((err) => {
      console.log("Audio playback blocked until user interacts with the page:", err);
    });
  } catch (e) {
    console.log("Audio playback error:", e);
  }
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [students, setStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState(null);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [schoolId, setSchoolId] = useState('');
  const [currentAdminUser, setCurrentAdminUser] = useState(null);
  const [activeNotification, setActiveNotification] = useState(null);

  // States for Alert & Broadcast features
  const [adminSenders, setAdminSenders] = useState([]);
  const [alertSender, setAlertSender] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [broadcastSender, setBroadcastSender] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');

  // States for Teacher Direct Registration Panel
  const [teacherName, setTeacherName] = useState('');
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [registeringTeacher, setRegisteringTeacher] = useState(false);

  // States for Teacher Invite Link Generator
  const [inviteGrade, setInviteGrade] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');
  const [inviting, setInviting] = useState(false);

  // States for CSV Data Ingestion
  const [importType, setImportType] = useState('students');
  const [csvInput, setCsvInput] = useState('');
  const [importingData, setImportingData] = useState(false);

  // States for Manual Student-Teacher Linking & Consent Provenance
  const [selectedLinkStudent, setSelectedLinkStudent] = useState('');
  const [selectedLinkTeacher, setSelectedLinkTeacher] = useState('');
  const [linkJustification, setLinkJustification] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  // States for Report Card Generator & Batch Actions
  const [reportGradeFilter, setReportGradeFilter] = useState('all');
  const [selectedReportStudent, setSelectedReportStudent] = useState('');

  // States for Teacher Attendance & Payroll Ledger Integration
  const [pendingRecords, setPendingRecords] = useState([]);
  const [approvedLedger, setApprovedLedger] = useState([]);
  const [reliefName, setReliefName] = useState('');
  const [reliefDate, setReliefDate] = useState(new Date().toISOString().split('T')[0]);
  const [reliefHours, setReliefHours] = useState(7.5);

  useEffect(() => {
    async function verifyAndFetchAdminData() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');
        setCurrentAdminUser(user);

        const { data: memberData, error: memberError } = await supabase
          .from('school_members')
          .select('role, school_slug')
          .eq('user_id', user.id)
          .single();

        if (memberError || !memberData || memberData.role !== 'admin') {
          throw new Error('Access denied: Administrator privileges required.');
        }

        setIsAdmin(true);
        const fetchedSlug = memberData.school_slug;
        setSchoolSlug(fetchedSlug);

        const { data: schoolRecord } = await supabase
          .from('schools')
          .select('id')
          .eq('slug', fetchedSlug)
          .single();

        if (schoolRecord) {
          setSchoolId(schoolRecord.id);
          
          const { data: attendanceData } = await supabase
            .from('teacher_attendance')
            .select('*, profiles:teacher_id(full_name)')
            .eq('school_id', schoolRecord.id)
            .order('timestamp', { ascending: false });

          if (attendanceData) {
            setPendingRecords(attendanceData.filter(r => r.status === 'Pending'));
            setApprovedLedger(attendanceData.filter(r => r.status === 'Approved'));
          }
        }

        const { data: logs, error: logError } = await supabase
          .from('compliance_audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (logError) throw logError;
        setAuditLogs(logs || []);

        const { data: staffData } = await supabase
          .from('school_members')
          .select('user_id, profiles(full_name), role')
          .eq('school_slug', fetchedSlug);

        if (staffData) {
          setAdminSenders(staffData.map(s => s.profiles?.full_name || 'Staff Member'));
          const teacherList = staffData.filter(s => s.role === 'teacher');
          setTeachers(teacherList);
        }

        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select(`
            id,
            first_name,
            last_name,
            grade_level,
            parent_student_links (
              parent_id
            )
          `)
          .eq('school_slug', fetchedSlug);

        if (!studentError && studentData) {
          setStudents(studentData);
        }

      } catch (err) {
        console.error('Admin dashboard error:', err.message);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    verifyAndFetchAdminData();
  }, []);

  useEffect(() => {
    if (!schoolSlug) return;

    const channel = supabase
      .channel('public:school_notifications:admin')
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
          setActiveNotification(newNotif);
          playNotificationSound(newNotif.is_critical);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolSlug]);

  async function refreshAttendanceLedger() {
    if (!schoolId) return;
    const { data: attendanceData } = await supabase
      .from('teacher_attendance')
      .select('*, profiles:teacher_id(full_name)')
      .eq('school_id', schoolId)
      .order('timestamp', { ascending: false });

    if (attendanceData) {
      setPendingRecords(attendanceData.filter(r => r.status === 'Pending'));
      setApprovedLedger(attendanceData.filter(r => r.status === 'Approved'));
    }
  }

  const handleAdminApprove = async (recordId) => {
    const { error } = await supabase
      .from('teacher_attendance')
      .update({ status: 'Approved' })
      .eq('id', recordId);

    if (error) {
      alert('Error approving record: ' + error.message);
    } else {
      refreshAttendanceLedger();
    }
  };

  const handleReliefSubmit = async (e) => {
    e.preventDefault();
    if (!reliefName || !schoolId || !currentAdminUser) return;

    const { error } = await supabase.from('teacher_attendance').insert({
      school_id: schoolId,
      teacher_id: currentAdminUser.id,
      relief_teacher_name: reliefName,
      status_type: 'Relief',
      timestamp: new Date(`${reliefDate}T09:00:00`).toISOString(),
      hours_worked: reliefHours,
      status: 'Approved'
    });

    if (error) {
      alert('Error adding relief teacher: ' + error.message);
    } else {
      alert(`Relief teacher ${reliefName} added to payment ledger.`);
      setReliefName('');
      refreshAttendanceLedger();
    }
  };

  const exportPayrollCSV = () => {
    if (approvedLedger.length === 0) {
      alert('No approved records to export.');
      return;
    }

    let csv = 'ID,Date,Staff / Relief Name,Status Type,Hours,Status\n';
    approvedLedger.forEach(row => {
      csv += `${row.id},${row.timestamp.split('T')[0]},"${row.profiles?.full_name || row.relief_teacher_name || 'Unknown'}","${row.status_type}",${row.hours_worked || 7.5},${row.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schoolSlug}_Payroll_Ledger.csv`;
    a.click();
  };

  const handleRegisterTeacher = async (e) => {
    e.preventDefault();
    if (!teacherName || !teacherEmail || !teacherPassword) return;
    setRegisteringTeacher(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: teacherEmail,
        password: teacherPassword,
        options: { data: { full_name: teacherName } }
      });

      if (authError) throw authError;
      const userId = authData.user?.id;
      if (!userId) throw new Error('Failed to create teacher user instance.');

      const { error: memberError } = await supabase
        .from('school_members')
        .insert([{
          user_id: userId,
          school_slug: schoolSlug,
          role: 'teacher'
        }]);

      if (memberError) throw memberError;

      alert(`Successfully registered ${teacherName} as a teacher for ${schoolSlug}!`);
      setTeacherName('');
      setTeacherEmail('');
      setTeacherPassword('');
    } catch (err) {
      alert('Error registering teacher: ' + err.message);
    } finally {
      setRegisteringTeacher(false);
    }
  };

  const handleGenerateInvite = async (e) => {
    e.preventDefault();
    if (!inviteGrade) return;
    setInviting(true);

    try {
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      const { error } = await supabase
        .from('school_invites')
        .insert([{
          school_slug: schoolSlug,
          role: 'teacher',
          grade: inviteGrade,
          token: token,
          is_used: false
        }]);

      if (error) throw error;

      const inviteUrl = `${window.location.origin}/teacher-signup?token=${token}`;
      setGeneratedInviteLink(inviteUrl);
    } catch (err) {
      alert('Error generating invite: ' + err.message);
    } finally {
      setInviting(false);
    }
  };

  const handleDataIngestion = async (e) => {
    e.preventDefault();
    if (!csvInput.trim()) return;
    setImportingData(true);

    try {
      const lines = csvInput.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const records = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        if (values.length !== headers.length) continue;
        
        const record = {};
        headers.forEach((header, index) => {
          record[header] = values[index];
        });
        records.push(record);
      }

      if (records.length === 0) throw new Error('No valid rows found. Check your CSV formatting.');

      if (importType === 'students') {
        const studentPayloads = records.map(r => ({
          school_slug: schoolSlug,
          first_name: r.first_name || r.firstname,
          last_name: r.last_name || r.lastname,
          grade_level: r.grade || r.grade_level || 'General'
        }));

        const { error } = await supabase.from('students').insert(studentPayloads);
        if (error) throw error;
        
        alert(`Successfully ingested ${records.length} students into ${schoolSlug}!`);

      } else if (importType === 'teachers') {
        const teacherPayloads = records.map(r => ({
          school_slug: schoolSlug,
          role: 'teacher',
          grade: r.grade || r.grade_level || 'General Staff',
          token: Math.random().toString(36).substring(2) + Date.now().toString(36),
          is_used: false
        }));

        const { error } = await supabase.from('school_invites').insert(teacherPayloads);
        if (error) throw error;

        alert(`Successfully generated ${records.length} secure teacher onboarding slots for ${schoolSlug}!`);
      }

      setCsvInput('');
      window.location.reload();

    } catch (err) {
      alert('Ingestion Error: ' + err.message);
    } finally {
      setImportingData(false);
    }
  };

  const handleSaveStudentTeacherLink = async (e) => {
    e.preventDefault();
    if (!selectedLinkStudent || !selectedLinkTeacher || !linkJustification.trim()) {
      alert("Please select a student, a teacher, and provide an authorization/consent reference note.");
      return;
    }

    setSavingLink(true);

    try {
      const { error: linkError } = await supabase
        .from('student_teacher_links')
        .insert([{
          school_slug: schoolSlug,
          student_id: selectedLinkStudent,
          teacher_id: selectedLinkTeacher
        }]);

      if (linkError) throw linkError;

      const { error: auditError } = await supabase
        .from('compliance_audit_logs')
        .insert([{
          school_slug: schoolSlug,
          action: 'MANUAL_STUDENT_TEACHER_LINK_APPROVED',
          user_id: currentAdminUser?.id,
          details: `Admin (${currentAdminUser?.email}) linked Student ID: ${selectedLinkStudent} to Teacher ID: ${selectedLinkTeacher} | Authorization Ref: ${linkJustification.trim()}`
        }]);

      if (auditError) throw auditError;

      alert("Student-teacher link saved successfully with compliance provenance logged!");
      setSelectedLinkStudent('');
      setSelectedLinkTeacher('');
      setLinkJustification('');
      window.location.reload();

    } catch (err) {
      alert("Error saving link: " + err.message);
    } finally {
      setSavingLink(false);
    }
  };

  const handleAlertSubmit = async (e) => {
    e.preventDefault();
    if (!alertSender || !alertMessage) return;

    const { error } = await supabase.from('school_notifications').insert([{
      school_slug: schoolSlug,
      target_role: 'teacher',
      sender_name: alertSender,
      message: alertMessage,
      is_critical: true
    }]);

    if (error) {
      alert("Error sending alert: " + error.message);
    } else {
      alert("Critical push alert dispatched to teachers!");
      setAlertMessage('');
    }
  };

  const handleBroadcastSubmit = async (e) => {
    e.preventDefault();
    if (!broadcastSender || !broadcastMessage) return;

    const { error } = await supabase.from('school_notifications').insert([{
      school_slug: schoolSlug,
      target_role: 'parent',
      sender_name: broadcastSender,
      message: broadcastMessage,
      is_critical: false
    }]);

    if (error) {
      alert("Error sending broadcast: " + error.message);
    } else {
      alert("School-wide broadcast dispatched to parents!");
      setBroadcastMessage('');
    }
  };

  const handlePrintIndividualReport = () => {
    if (!selectedReportStudent) {
      alert("Please select a student first before printing.");
      return;
    }
    alert(`Preparing individual report card print for Student ID: ${selectedReportStudent}`);
    window.print();
  };

  const handleMassPrint = (scope) => {
    if (scope === 'grade' && reportGradeFilter === 'all') {
      alert("Please select a specific grade level for grade mass print.");
      return;
    }
    alert(`Initiating mass print operation (${scope === 'grade' ? reportGradeFilter : 'School-Wide'})...`);
    window.print();
  };

  const filteredStudents = students.filter(s => {
    const fullName = `${s.first_name || ''} ${s.last_name || ''}`.toLowerCase();
    return fullName.includes(searchQuery.toLowerCase());
  });

  const reportFilteredStudents = reportGradeFilter === 'all'
    ? students
    : students.filter(s => s.grade_level === reportGradeFilter);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader /> 
      
      <nav className="bg-[#111827] border-b border-gray-800 px-6 py-3 flex space-x-6 text-sm font-medium overflow-x-auto">
        <a href="/dashboard" className="text-indigo-400 border-b-2 border-indigo-400 pb-1">Dashboard</a> 
        <a href="/role-assign" className="text-gray-400 hover:text-white transition-colors pb-1">Role Assign</a> 
        <a href="/attendance-vouch" className="text-gray-400 hover:text-white transition-colors pb-1">Attendance Vouch</a> 
        <a href="/events" className="text-gray-400 hover:text-white transition-colors pb-1">Events</a> 
        <a href="/reportcards" className="text-gray-400 hover:text-white transition-colors pb-1">Report Cards</a> 
        <a href="/digital-id" className="text-gray-400 hover:text-white transition-colors pb-1">Digital ID</a> 
      </nav>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Admin Compliance & Management Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Dispatch alerts, manage school broadcasts, review student directories, and monitor system access records. 
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400">Verifying administrative access...</div>
        ) : errorMsg ? (
          <div className="p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-200 text-sm">
            {errorMsg}
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* ENTERPRISE ATTENDANCE HUB */}
            <AttendanceHub schoolSlug={schoolSlug} userRole="admin" />

            {/* 1. PAYROLL LEDGER (Rendered from PayrollLedger.jsx) */}
            <PayrollLedger 
              pendingRecords={pendingRecords}
              approvedLedger={approvedLedger}
              reliefName={reliefName} setReliefName={setReliefName}
              reliefDate={reliefDate} setReliefDate={setReliefDate}
              reliefHours={reliefHours} setReliefHours={setReliefHours}
              onApprove={handleAdminApprove}
              onReliefSubmit={handleReliefSubmit}
              onExportCSV={exportPayrollCSV}
            />

            {/* ENTERPRISE ACADEMIC GRADING PORTAL */}
            <AcademicGradingPortal schoolSlug={schoolSlug} userRole="admin" />

            {/* 2. ADMIN FORMS (Rendered from AdminForms.jsx) */}
            <TeacherProvisioningPanel 
              teacherName={teacherName} setTeacherName={setTeacherName}
              teacherEmail={teacherEmail} setTeacherEmail={setTeacherEmail}
              teacherPassword={teacherPassword} setTeacherPassword={setTeacherPassword}
              registeringTeacher={registeringTeacher} onRegister={handleRegisterTeacher}
            />

            <TeacherInvitePanel 
              inviteGrade={inviteGrade} setInviteGrade={setInviteGrade}
              inviting={inviting} onGenerateInvite={handleGenerateInvite}
              generatedInviteLink={generatedInviteLink}
            />

            <DataIngestionPanel 
              importType={importType} setImportType={setImportType}
              csvInput={csvInput} setCsvInput={setCsvInput}
              importingData={importingData} onIngest={handleDataIngestion}
            />

            <StudentTeacherLinkPanel 
              students={students} teachers={teachers}
              selectedLinkStudent={selectedLinkStudent} setSelectedLinkStudent={setSelectedLinkStudent}
              selectedLinkTeacher={selectedLinkTeacher} setSelectedLinkTeacher={setSelectedLinkTeacher}
              linkJustification={linkJustification} setLinkJustification={setLinkJustification}
              savingLink={savingLink} onSaveLink={handleSaveStudentTeacherLink}
            />

            <ReportCardsPanel 
              reportGradeFilter={reportGradeFilter} setReportGradeFilter={setReportGradeFilter}
              selectedReportStudent={selectedReportStudent} setSelectedReportStudent={setSelectedReportStudent}
              reportFilteredStudents={reportFilteredStudents}
              onPrintIndividual={handlePrintIndividualReport}
              onMassPrint={handleMassPrint}
            />

            {/* 3. BROADCAST PANEL (Rendered from BroadcastPanel.jsx) */}
            <BroadcastPanel 
              adminSenders={adminSenders}
              alertSender={alertSender} setAlertSender={setAlertSender}
              alertMessage={alertMessage} setAlertMessage={setAlertMessage}
              onAlertSubmit={handleAlertSubmit}
              broadcastSender={broadcastSender} setBroadcastSender={setBroadcastSender}
              broadcastMessage={broadcastMessage} setBroadcastMessage={setBroadcastMessage}
              onBroadcastSubmit={handleBroadcastSubmit}
            />

            {/* Student Directory & Compliance Mapping */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-100">School Student Directory & Compliance Mapping</h3>
                  <p className="text-xs text-gray-400 mt-0.5">Database records mapped with parent-student links for privacy auditing.</p>
                </div>
                <div className="w-full sm:w-72">
                  <input 
                    type="text"
                    placeholder="Search student directory..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-6 text-gray-400 text-sm">No student records found in database for this school.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/50 font-mono text-xs">
                        <th className="py-3 px-6">Student First Name</th>
                        <th className="py-3 px-6">Student Last Name</th>
                        <th className="py-3 px-6">Grade Level</th>
                        <th className="py-3 px-6">Parent Link Status</th>
                        <th className="py-3 px-6">Parent ID(s)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 text-xs font-mono">
                      {filteredStudents.map((student) => {
                        const links = student.parent_student_links || [];
                        const isLinked = links.length > 0;
                        return (
                          <tr key={student.id} className="hover:bg-gray-900/30 transition-colors"> 
                            <td className="py-3 px-6 text-gray-200 font-sans font-medium">
                              {student.first_name}
                            </td>
                            <td className="py-3 px-6 text-gray-200 font-sans font-medium">
                              {student.last_name}
                            </td>
                            <td className="py-3 px-6 text-gray-300">
                              {student.grade_level || '—'}
                            </td>
                            <td className="py-3 px-6">
                              <span className={`px-2 py-1 rounded text-[10px] font-bold ${isLinked ? 'bg-green-950 text-green-300 border border-green-800' : 'bg-amber-950 text-amber-300 border border-amber-800'}`}>
                                {isLinked ? 'Linked' : 'Pending Link'}
                              </span>
                            </td>
                            <td className="py-3 px-6 text-gray-500">
                              {isLinked ? links.map(l => l.parent_id).join(', ') : 'None'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Compliance Audit Trail Section */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
              <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
                <h3 className="text-base font-semibold text-gray-100">Compliance Audit Trail</h3>
                <span className="text-xs font-mono text-gray-400 bg-gray-900 px-2.5 py-1 rounded-md border border-gray-800">
                  Showing latest {auditLogs.length} events
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="p-6 text-gray-400 text-sm">No audit logs recorded yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/50 font-mono text-xs">
                        <th className="py-3 px-6">Timestamp (UTC)</th>
                        <th className="py-3 px-6">Action</th>
                        <th className="py-3 px-6">Details</th>
                        <th className="py-3 px-6">User UUID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-gray-900/30 transition-colors"> 
                          <td className="py-3 px-6 text-gray-300">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="py-3 px-6 text-indigo-400 font-semibold">
                            {log.action}
                          </td>
                          <td className="py-3 px-6 text-gray-300">
                            {log.details || '—'}
                          </td>
                          <td className="py-3 px-6 text-gray-500">
                            {log.user_id ? `${log.user_id.slice(0, 8)}...` : 'System'}
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

      {/* Live Alert Popup Notification Banner */}
      {activeNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-gray-900 border border-red-500/50 rounded-xl p-4 shadow-2xl animate-bounce">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded font-bold uppercase">
                {activeNotification.is_critical ? '🚨 Critical Alert' : '📢 Broadcast'}
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