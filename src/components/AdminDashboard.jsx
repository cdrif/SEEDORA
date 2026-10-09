import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';
import AttendanceHub from './AttendanceHub';
import AcademicGradingPortal from './AcademicGradingPortal';

// Helper to play custom uploaded audio files
function playNotificationSound(isCritical = false) {
  try {
    const audioPath = isCritical 
      ? '/sounds/tithuh-warning-545568.mp3' // Critical warning sound
      : '/sounds/liecio-message-alert-190042.mp3'; // Gentle chime for broadcasts
      
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

        // Fetch School UUID
        const { data: schoolRecord } = await supabase
          .from('schools')
          .select('id')
          .eq('slug', fetchedSlug)
          .single();

        if (schoolRecord) {
          setSchoolId(schoolRecord.id);
          
          // Fetch Teacher Attendance & Payroll Ledger
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

  // Realtime notification listener hook effect for Admin
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
            
            {/* ENTERPRISE ATTENDANCE HUB MODULE */}
            <AttendanceHub schoolSlug={schoolSlug} userRole="admin" />

            {/* TEACHER ATTENDANCE APPROVAL & PAYMENT LEDGER INTEGRATION */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-100">Teacher Attendance Approvals & Payroll Ledger</h2>
                <p className="text-sm text-gray-400">Review teacher check-ins, manage relief teacher payouts, and export verified ledger data.</p>
              </div>

              {/* Pending Approvals Queue */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Pending Teacher Submissions (Awaiting Approval)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase font-mono">
                        <th className="py-2 px-3">Staff Member</th>
                        <th className="py-2 px-3">Status Type</th>
                        <th className="py-2 px-3">Timestamp</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {pendingRecords.length === 0 ? (
                        <tr><td colSpan="4" className="py-4 text-center text-gray-500 text-xs">No pending submissions found.</td></tr>
                      ) : (
                        pendingRecords.map(rec => (
                          <tr key={rec.id} className="hover:bg-gray-800/40">
                            <td className="py-2 px-3 font-medium text-white">{rec.profiles?.full_name || 'Staff Member'}</td>
                            <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs ${rec.status_type === 'Present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{rec.status_type}</span></td>
                            <td className="py-2 px-3 text-gray-300 text-xs">{new Date(rec.timestamp).toLocaleString()}</td>
                            <td className="py-2 px-3 text-right">
                              <button onClick={() => handleAdminApprove(rec.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded transition">
                                Approve & Pay
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Manual Relief Teacher Entry Form */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-1">Manual Relief Teacher Entry</h3>
                <p className="text-xs text-gray-400 mb-3">Add relief staff manually directly into the approved payment ledger.</p>
                <form onSubmit={handleReliefSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">Relief Teacher Name</label>
                    <input type="text" value={reliefName} onChange={e => setReliefName(e.target.value)} required placeholder="e.g. John Doe" className="w-full bg-black border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">Date</label>
                    <input type="date" value={reliefDate} onChange={e => setReliefDate(e.target.value)} required className="w-full bg-black border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs" />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-gray-400 mb-1">Hours Worked</label>
                    <input type="number" step="0.5" value={reliefHours} onChange={e => setReliefHours(e.target.value)} required className="w-full bg-black border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs" />
                  </div>
                  <div className="flex items-end">
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 rounded text-xs transition">
                      Add Relief to Ledger
                    </button>
                  </div>
                </form>
              </div>

              {/* Approved Payment Ledger & Export */}
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Approved Payment Ledger</h3>
                    <p className="text-xs text-gray-400">Verified entries ready for payroll or government reimbursement.</p>
                  </div>
                  <button onClick={exportPayrollCSV} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition shadow">
                    Download CSV
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase font-mono">
                        <th className="py-2 px-3">Staff / Relief Name</th>
                        <th className="py-2 px-3">Type</th>
                        <th className="py-2 px-3">Date / Timestamp</th>
                        <th className="py-2 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800">
                      {approvedLedger.length === 0 ? (
                        <tr><td colSpan="4" className="py-4 text-center text-gray-500 text-xs">No approved records in payment ledger.</td></tr>
                      ) : (
                        approvedLedger.map(rec => (
                          <tr key={rec.id} className="hover:bg-gray-800/40">
                            <td className="py-2 px-3 font-medium text-white">{rec.profiles?.full_name || rec.relief_teacher_name || 'Relief Staff'}</td>
                            <td className="py-2 px-3 text-gray-300 text-xs">{rec.status_type}</td>
                            <td className="py-2 px-3 text-gray-300 text-xs">{new Date(rec.timestamp).toLocaleString()}</td>
                            <td className="py-2 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold">Approved</span></td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* ENTERPRISE ACADEMIC GRADING PORTAL MODULE */}
            <AcademicGradingPortal schoolSlug={schoolSlug} userRole="admin" />

            {/* Direct Teacher Account Provisioning Panel */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100">Register New Teacher Account</h2>
              <p className="text-sm text-gray-400 mb-4">Directly provision a teacher profile bound to your school slug with pre-assigned role privileges.</p>
              
              <form onSubmit={handleRegisterTeacher} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Teacher Full Name:</label>
                  <input 
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Teacher Email Address:</label>
                  <input 
                    type="email"
                    value={teacherEmail}
                    onChange={(e) => setTeacherEmail(e.target.value)}
                    placeholder="teacher@school.edu"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Temporary Password:</label>
                  <input 
                    type="password"
                    value={teacherPassword}
                    onChange={(e) => setTeacherPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  />
                </div>
                <button type="submit" disabled={registeringTeacher} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
                  {registeringTeacher ? 'Registering Teacher...' : 'Provision Teacher Account'}
                </button>
              </form>
            </div>

            {/* Teacher Invite Link Generation Section */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100">Generate Secure Teacher Invite Link</h2>
              <p className="text-sm text-gray-400 mb-4">Create an automated registration link for a new teacher bound to your school.</p>
              
              <form onSubmit={handleGenerateInvite} className="space-y-4 max-w-xl">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Assigned Grade Level:</label>
                  <input 
                    type="text"
                    value={inviteGrade}
                    onChange={(e) => setInviteGrade(e.target.value)}
                    placeholder="e.g., Grade 5 or High School Science"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  />
                </div>
                <button type="submit" disabled={inviting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
                  {inviting ? 'Generating...' : 'Generate Invite Link'}
                </button>
              </form>

              {generatedInviteLink && (
                <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
                  <p className="text-xs text-gray-400 mb-1">Share this secure link with the teacher:</p>
                  <input 
                    type="text" 
                    readOnly 
                    value={generatedInviteLink} 
                    className="w-full bg-black border border-gray-800 p-2 rounded text-indigo-300 text-xs font-mono select-all"
                  />
                </div>
              )}
            </div>

            {/* Data Ingestion & CSV Import Panel */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100">Bulk Data Ingestion (CSV)</h2>
              <p className="text-sm text-gray-400 mb-4">Import student directories or generate teacher invite slots in bulk using standard CSV format.</p>
              
              <form onSubmit={handleDataIngestion} className="space-y-4 max-w-2xl">
                <div className="flex space-x-6">
                  <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="importType" 
                      value="students" 
                      checked={importType === 'students'} 
                      onChange={() => setImportType('students')}
                      className="text-indigo-600 focus:ring-indigo-500 bg-gray-900 border-gray-700"
                    />
                    <span>Import Students</span>
                  </label>
                  <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
                    <input 
                      type="radio" 
                      name="importType" 
                      value="teachers" 
                      checked={importType === 'teachers'} 
                      onChange={() => setImportType('teachers')}
                      className="text-indigo-600 focus:ring-indigo-500 bg-gray-900 border-gray-700"
                    />
                    <span>Import Teacher Roster (Invites)</span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">
                    Paste CSV Data (Format: <span className="text-indigo-400">first_name, last_name, grade_level</span>):
                  </label>
                  <textarea 
                    value={csvInput}
                    onChange={(e) => setCsvInput(e.target.value)}
                    placeholder="first_name,last_name,grade_level&#10;John,Doe,Grade 9&#10;Jane,Smith,Grade 10"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs font-mono text-white h-32 resize-none focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={importingData} 
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                >
                  {importingData ? 'Ingesting Records...' : `Process & Ingest ${importType === 'students' ? 'Students' : 'Teachers'}`}
                </button>
              </form>
            </div>

            {/* Manual Student-Teacher Linking Panel with Consent Provenance */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100">Manual Student-Teacher Linking</h2>
              <p className="text-sm text-gray-400 mb-4">Manually assign a student relationship mapping and record administrative approval with proof of authorization.</p>
              
              <form onSubmit={handleSaveStudentTeacherLink} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Select Student:</label>
                    <select
                      value={selectedLinkStudent}
                      onChange={(e) => setSelectedLinkStudent(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    >
                      <option value="" disabled>-- Choose Student --</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.grade_level || 'General'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Select Teacher:</label>
                    <select
                      value={selectedLinkTeacher}
                      onChange={(e) => setSelectedLinkTeacher(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    >
                      <option value="" disabled>-- Choose Teacher --</option>
                      {teachers.map(t => (
                        <option key={t.user_id} value={t.user_id}>{t.profiles?.full_name || 'Teacher Staff'} ({t.user_id.slice(0, 8)}...)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Authorization Reference / Consent Ticket ID:</label>
                  <input 
                    type="text"
                    value={linkJustification}
                    onChange={(e) => setLinkJustification(e.target.value)}
                    placeholder="e.g., Parent Email Approval #4829 or Principal Signed Form"
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    required
                  />
                  <p className="text-[11px] text-gray-500 mt-1">Required for auditor provenance: enter the ticket or reference number supporting this manual override.</p>
                </div>

                <button
                  type="submit"
                  disabled={savingLink}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md"
                >
                  {savingLink ? 'Saving Link...' : 'Save Link & Log Provenance'}
                </button>
              </form>
            </div>

            {/* REPORT CARDS SELECTOR & BATCH ACTIONS PANEL */}
            <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-100">Student Report Cards & Batch Actions</h2>
              <p className="text-sm text-gray-400 mb-4">Search and select students by grade level for preview or bulk printing operations.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <label className="block text-xs font-mono text-gray-400 mb-1">Filter by Grade Level:</label>
                    <select 
                      value={reportGradeFilter}
                      onChange={(e) => setReportGradeFilter(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    >
                      <option value="all">All Grades</option>
                      <option value="Grade 9">Grade 9</option>
                      <option value="Grade 10">Grade 10</option>
                      <option value="Grade 11">Grade 11</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-mono text-gray-400 mb-1">Select Student:</label>
                    <select 
                      value={selectedReportStudent}
                      onChange={(e) => setSelectedReportStudent(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                    >
                      <option value="" disabled>Select student from directory...</option>
                      {reportFilteredStudents.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.first_name} {student.last_name} (ID: {student.id}) - {student.grade_level || 'General'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button 
                    type="button" 
                    onClick={handlePrintIndividualReport}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                  >
                    Print Individual Report
                  </button>
                </div>

                <div className="border-t md:border-t-0 md:border-l border-gray-800 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-200 mb-1">Mass Print Operations</h3>
                    <p className="text-xs text-gray-400 mb-4">Print all generated report cards in bulk for compliance archiving.</p>
                  </div>
                  <div className="space-y-3">
                    <button 
                      type="button" 
                      onClick={() => handleMassPrint('grade')}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Mass Print Selected Grade
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleMassPrint('school')}
                      className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer"
                    >
                      Mass Print School-Wide
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* SPLIT-PANEL CARD LAYOUT FOR ALERTS & BROADCASTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Box 1: Critical Alerts Centre */}
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 relative overflow-hidden shadow-sm">
                <h2 className="text-lg font-semibold text-gray-100">Critical Alerts Centre</h2>
                <p className="text-sm text-gray-400 mb-4">Send instant push notifications exclusively to registered teachers.</p>
                
                <form onSubmit={handleAlertSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Authorised Sender:</label>
                    <select 
                      value={alertSender} 
                      onChange={(e) => setAlertSender(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    >
                      <option value="" disabled>Select Admin...</option>
                      {adminSenders.map((name, idx) => (
                        <option key={idx} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Alert Description / Message:</label>
                    <textarea 
                      value={alertMessage}
                      onChange={(e) => setAlertMessage(e.target.value)}
                      placeholder="Type critical alert message for teachers..."
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white h-24 resize-none"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer">
                    Send Push to Teachers
                  </button>
                </form>
              </div>

              {/* Box 2: School Wide Broadcast System */}
              <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 relative overflow-hidden shadow-sm">
                <h2 className="text-lg font-semibold text-gray-100">School Wide Broadcast System</h2>
                <p className="text-sm text-gray-400 mb-4">Send broadcasts to verified parents linked under the school slug.</p>
                
                <form onSubmit={handleBroadcastSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Authorised Sender:</label>
                    <select 
                      value={broadcastSender} 
                      onChange={(e) => setBroadcastSender(e.target.value)}
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
                      required
                    >
                      <option value="" disabled>Select Admin...</option>
                      {adminSenders.map((name, idx) => (
                        <option key={idx} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-gray-400 mb-1">Broadcast Description / Message:</label>
                    <textarea 
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="Type school-wide message for verified parents..."
                      className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white h-24 resize-none"
                      required
                    />
                  </div>
                  <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer">
                    Broadcast to Parents
                  </button>
                </form>
              </div>

            </div>

            {/* School Student Directory & Compliance Mapping */}
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