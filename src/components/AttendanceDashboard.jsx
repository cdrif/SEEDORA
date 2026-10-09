import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AttendanceDashboard({ schoolSlug }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [schoolName, setSchoolName] = useState('');
  
  // Attendance state
  const [myRecords, setMyRecords] = useState([]);
  const [pendingRecords, setPendingRecords] = useState([]);
  const [approvedLedger, setApprovedLedger] = useState([]);
  const [loading, setLoading] = useState(true);

  // Relief Teacher Manual Entry Form State
  const [reliefName, setReliefName] = useState('');
  const [reliefDate, setReliefDate] = useState(new Date().toISOString().split('T')[0]);
  const [reliefHours, setReliefHours] = useState(7.5);

  useEffect(() => {
    initializePortal();
  }, [schoolSlug]);

  async function initializePortal() {
    setLoading(true);
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      window.location.href = '/login';
      return;
    }
    setSession(currentSession);

    // 1. Resolve School ID from Slug
    const { data: schoolData, error: schoolErr } = await supabase
      .from('schools')
      .select('id, name')
      .eq('slug', schoolSlug)
      .single();

    if (schoolErr || !schoolData) {
      alert('Invalid school portal link.');
      return;
    }
    setSchoolId(schoolData.id);
    setSchoolName(schoolData.name);

    // 2. Fetch User Profile & Role (RBAC)
    const { data: userProfile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentSession.user.id)
      .single();

    if (profileErr || !userProfile || userProfile.school_id !== schoolData.id) {
      alert('Access denied: Unauthorized tenant or profile missing.');
      return;
    }
    setProfile(userProfile);

    // 3. Load Data based on Role
    await loadAttendanceData(userProfile, schoolData.id);
    setLoading(false);
  }

  async function loadAttendanceData(userProfile, currentSchoolId) {
    const isAdminOrBursar = ['principal', 'bursar', 'admin', 'treasurer'].includes(userProfile.role);

    if (isAdminOrBursar) {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('*, profiles:teacher_id(full_name)')
        .eq('school_id', currentSchoolId)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        setPendingRecords(data.filter(r => r.status === 'Pending'));
        setApprovedLedger(data.filter(r => r.status === 'Approved'));
      }
    } else {
      const { data, error } = await supabase
        .from('teacher_attendance')
        .select('*')
        .eq('teacher_id', userProfile.id)
        .eq('school_id', currentSchoolId)
        .order('timestamp', { ascending: false });

      if (!error && data) {
        setMyRecords(data);
      }
    }
  }

  async function handleAttendanceSubmit(statusType) {
    const timestamp = new Date().toISOString();
    const { error } = await supabase.from('teacher_attendance').insert({
      school_id: schoolId,
      teacher_id: profile.id,
      status_type: statusType,
      timestamp: timestamp,
      status: 'Pending'
    });

    if (error) {
      alert(`Error logging attendance: ${error.message}`);
    } else {
      alert(`Successfully marked as ${statusType} at ${new Date(timestamp).toLocaleTimeString()}.`);
      loadAttendanceData(profile, schoolId);
    }
  }

  async function approveAttendance(recordId) {
    const { error } = await supabase
      .from('teacher_attendance')
      .update({ status: 'Approved' })
      .eq('id', recordId);

    if (error) {
      alert(`Failed to approve: ${error.message}`);
    } else {
      loadAttendanceData(profile, schoolId);
    }
  }

  async function handleReliefSubmit(e) {
    e.preventDefault();
    const { error } = await supabase.from('teacher_attendance').insert({
      school_id: schoolId,
      teacher_id: profile.id,
      relief_teacher_name: reliefName,
      status_type: 'Relief',
      timestamp: new Date().toISOString(),
      hours_worked: reliefHours,
      status: 'Approved'
    });

    if (error) {
      alert(`Error adding relief teacher: ${error.message}`);
    } else {
      alert(`Relief teacher ${reliefName} successfully added to payment ledger.`);
      setReliefName('');
      loadAttendanceData(profile, schoolId);
    }
  }

  function exportPayrollCSV() {
    if (approvedLedger.length === 0) {
      alert('No approved records available for export.');
      return;
    }

    let csv = 'ID,Date,Staff / Relief Name,Status Type,Hours,Approval Status\n';
    approvedLedger.forEach(row => {
      csv += `${row.id},${row.timestamp.split('T')[0]},"${row.profiles?.full_name || row.relief_teacher_name || 'Unknown'}","${row.status_type}",${row.hours_worked || 7.5},${row.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${schoolSlug}_Payroll_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  if (loading) {
    return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Secure School Portal...</div>;
  }

  const isAdminOrBursar = ['principal', 'bursar', 'admin', 'treasurer'].includes(profile.role);
  const daysActive = myRecords.filter(r => r.status_type === 'Present').length;
  const daysAbsent = myRecords.filter(r => r.status_type === 'Absent').length;

  return (
    <div className="min-h-screen bg-slate-950 text-gray-100 p-6 font-sans">
      <header className="max-w-6xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8 flex justify-between items-center shadow-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">Seedora Attendance & Payroll Portal</h1>
          <p className="text-sm text-blue-400 mt-1">{schoolName} &bull; Role: <span className="uppercase font-semibold">{profile.role}</span></p>
        </div>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href='/login')} className="bg-slate-800 hover:bg-slate-700 text-sm px-4 py-2 rounded-lg text-gray-300 transition">
          Sign Out
        </button>
      </header>

      <main className="max-w-6xl mx-auto space-y-8">
        
        {/* TEACHER VIEW */}
        {!isAdminOrBursar && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg space-y-4">
              <h2 className="text-lg font-semibold text-white">Daily Attendance Check-In</h2>
              <p className="text-xs text-gray-400">Record your presence or absence for today. Timestamps are automatically captured.</p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button onClick={() => handleAttendanceSubmit('Present')} className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition shadow">
                  Mark Present
                </button>
                <button onClick={() => handleAttendanceSubmit('Absent')} className="bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white font-medium py-3 rounded-xl transition shadow">
                  Mark Absent
                </button>
              </div>
            </div>

            <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg flex flex-col justify-between">
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">My Attendance Metrics</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-gray-400 block uppercase">Days Active (Present)</span>
                    <span className="text-3xl font-bold text-emerald-400">{daysActive}</span>
                  </div>
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <span className="text-xs text-gray-400 block uppercase">Days Absent</span>
                    <span className="text-3xl font-bold text-red-400">{daysAbsent}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ADMIN / BURSAR VIEW */}
        {isAdminOrBursar && (
          <div className="space-y-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-4">Pending Teacher Submissions (Awaiting Approval)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-gray-400 uppercase">
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Status Type</th>
                      <th className="py-3 px-4">Timestamp</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {pendingRecords.length === 0 ? (
                      <tr><td colSpan="4" className="py-6 text-center text-gray-500">No pending submissions found.</td></tr>
                    ) : (
                      pendingRecords.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-medium text-white">{rec.profiles?.full_name || 'Staff Member'}</td>
                          <td className="py-3 px-4"><span className={`px-2 py-1 rounded text-xs ${rec.status_type === 'Present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{rec.status_type}</span></td>
                          <td className="py-3 px-4 text-gray-300">{new Date(rec.timestamp).toLocaleString()}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => approveAttendance(rec.id)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded-lg transition">
                              Approve & Transition to Payment
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <h2 className="text-lg font-semibold text-white mb-2">Manual Relief Teacher Entry</h2>
              <p className="text-xs text-gray-400 mb-4">Relief teachers are added manually by the admin and logged directly into the payment ledger.</p>
              <form onSubmit={handleReliefSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Relief Teacher Name</label>
                  <input type="text" value={reliefName} onChange={e => setReliefName(e.target.value)} required placeholder="e.g. John Doe" className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Date</label>
                  <input type="date" value={reliefDate} onChange={e => setReliefDate(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase text-gray-400 mb-1">Hours Worked</label>
                  <input type="number" step="0.5" value={reliefHours} onChange={e => setReliefHours(e.target.value)} required className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white text-sm" />
                </div>
                <div className="flex items-end">
                  <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2 rounded-lg text-sm transition">
                    Add Relief to Ledger
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-white">Approved Payment Ledger</h2>
                  <p className="text-xs text-gray-400">Verified entries ready for state government submission or bursar payout.</p>
                </div>
                <button onClick={exportPayrollCSV} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-lg transition shadow">
                  Download All Entries (CSV)
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-gray-400 uppercase">
                      <th className="py-3 px-4">Staff / Relief Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Timestamp / Date</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {approvedLedger.length === 0 ? (
                      <tr><td colSpan="4" className="py-6 text-center text-gray-500">No approved records in payment ledger.</td></tr>
                    ) : (
                      approvedLedger.map(rec => (
                        <tr key={rec.id} className="hover:bg-slate-800/40">
                          <td className="py-3 px-4 font-medium text-white">{rec.profiles?.full_name || rec.relief_teacher_name || 'Relief Staff'}</td>
                          <td className="py-3 px-4 text-gray-300">{rec.status_type}</td>
                          <td className="py-3 px-4 text-gray-300">{new Date(rec.timestamp).toLocaleString()}</td>
                          <td className="py-3 px-4"><span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400 font-semibold">Approved for Payment</span></td>
                        </tr>
                      ))
                    )}
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