import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const defaultFeatures = { 
  // Parents Portal Features
  parentOverview: true,
  parentDailySchedule: true,
  parentCanteen: true,
  parentDigitalId: true,
  parentEvents: true,
  parentHomework: true,
  parentHub: true,
  parentSports: true,
  parentBusPlanner: true,
  parentReportCards: true,
  parentLostAndFound: true,
  parentBehavior: true,

  // Teachers Portal Features
  teacherOverview: true,
  teacherDailySchedule: true,
  teacherEvents: true,
  teacherHomework: true,
  teacherHub: true,
  teacherSports: true,
  teacherReportCards: true,
  teacherLostAndFound: true,
  teacherBehavior: true,

  // Admin & Core Platform Features
  adminOverview: true,
  adminAwards: true,
  adminEvents: true,
  adminReportCards: true,
  adminAttendance: true,
  adminCanteen: true,
  adminFinance: true,
  adminLostAndFound: true,
  adminSports: true,
  adminStudentLink: true,
  adminSportsRecords: true,
  adminEmergencyAlerts: true,
  adminDigitalIds: true,
  adminBusPlanner: true,
  adminLocalization: true,
  adminEnrollments: true,
  adminFacilities: true
};

function SuperAdminNavbar({ activeTab, setActiveTab }) {
  const tabs = [
    { id: 'schools', label: 'Schools' },
    { id: 'invites', label: 'Principal Invites' },
    { id: 'matrix', label: 'Feature Matrix' },
    { id: 'bugs', label: 'Bug Tracker' },
    { id: 'todo', label: 'Employee To-Do' },
    { id: 'audit', label: 'Audit Logs' }
  ];

  return (
    <header className="bg-[#0b0f19] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 text-white font-bold px-3 py-1.5 rounded-lg text-sm tracking-wider">
            SEEDORA
          </div>
          <span className="text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
            Super Admin Portal
          </span>
        </div>
        <nav className="flex space-x-1 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === t.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState('schools');
  const [currentEmployee] = useState('Admin User');

  const [schools, setSchools] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [todoItems, setTodos] = useState([]);
  
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolStatusFilter, setSchoolStatusFilter] = useState('All');
  
  // Matrix specific states
  const [selectedMatrixSchoolId, setSelectedMatrixSchoolId] = useState('');
  const [featuresData, setFeaturesData] = useState({});
  const [matrixEdits, setMatrixEdits] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Invite Form State
  const [invitePrincipalName, setInvitePrincipalName] = useState('');
  const [inviteSchoolName, setInviteSchoolName] = useState('');
  const [inviteSchoolSlug, setInviteSchoolSlug] = useState('');
  const [inviteContactEmail, setInviteContactEmail] = useState('');

  // Todo Form State
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoType, setNewTodoType] = useState('Task');

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    const [schoolsRes, logsRes, bugsRes, todosRes, featuresRes] = await Promise.all([
      supabase.from('schools').select('*'),
      supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
      supabase.from('bug_reports').select('*'),
      supabase.from('employee_todos').select('*'),
      supabase.from('school_features').select('*')
    ]);

    if (schoolsRes.data) {
      setSchools(schoolsRes.data);
      if (schoolsRes.data.length > 0 && !selectedMatrixSchoolId) {
        setSelectedMatrixSchoolId(schoolsRes.data[0].id);
      }
    }
    if (logsRes.data) setAuditLogs(logsRes.data);
    if (bugsRes.data) setBugReports(bugsRes.data);
    if (todosRes.data) setTodos(todosRes.data);

    if (featuresRes.data) {
      const featureMap = {};
      featuresRes.data.forEach(row => {
        featureMap[row.school_id] = { ...defaultFeatures, ...(row.features || {}) };
      });
      setFeaturesData(featureMap);
      setMatrixEdits(featureMap);
    }
  };

  const logAction = async (actionDescription) => {
    const newLog = { employee: currentEmployee, action: actionDescription, timestamp: new Date().toISOString() };
    await supabase.from('audit_logs').insert([newLog]);
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (data) setAuditLogs(data);
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!invitePrincipalName || !inviteSchoolName || !inviteContactEmail) {
      alert('Please fill out all required fields.');
      return;
    }

    const finalSlug = inviteSchoolSlug && inviteSchoolSlug.trim() !== '' 
      ? inviteSchoolSlug 
      : inviteSchoolName.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

    const { data: schoolData, error: schoolError } = await supabase.from('schools').insert([{
      name: inviteSchoolName.trim(),
      slug: finalSlug.trim(),
      status: 'Contract',
      students: 0,
      renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }]).select('id').single();

    if (schoolError) {
      alert('Error registering school: ' + schoolError.message);
      return;
    }

    if (schoolData?.id) {
      await supabase.from('school_features').upsert({
        school_id: schoolData.id,
        features: defaultFeatures,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_id' });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const currentSession = sessionData?.session;

    const tempPassword = `Temp-${Math.random().toString(36).slice(-8)}!`;
    await supabase.auth.signUp({
      email: inviteContactEmail.trim(),
      password: tempPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/update-password`,
        data: { full_name: invitePrincipalName, role: 'principal', school_slug: finalSlug }
      }
    });

    if (currentSession) {
      await supabase.auth.setSession({
        access_token: currentSession.access_token,
        refresh_token: currentSession.refresh_token,
      });
    }

    await supabase.auth.resetPasswordForEmail(inviteContactEmail.trim(), {
      redirectTo: `${window.location.origin}/update-password`,
    });

    await logAction(`Invited principal ${invitePrincipalName} for school ${inviteSchoolName} (Slug: ${finalSlug})`);
    
    alert(`Successfully registered ${inviteSchoolName} and sent invitation email!`);
    setInvitePrincipalName('');
    setInviteSchoolName('');
    setInviteSchoolSlug('');
    setInviteContactEmail('');
    fetchAllData();
  };

  const handleDeleteSchool = async (schoolId, schoolName) => {
    if (!window.confirm(`Are you sure you want to delete ${schoolName}?`)) return;

    const { error } = await supabase.from('schools').delete().eq('id', schoolId);
    if (error) {
      alert('Error deleting school: ' + error.message);
    } else {
      await logAction(`Deleted school: ${schoolName}`);
      fetchAllData();
    }
  };

  const updateSchoolStatus = async (schoolId, schoolName, nextStatus) => {
    const { error } = await supabase.from('schools').update({ status: nextStatus }).eq('id', schoolId);
    if (!error) {
      setSchools(schools.map(s => s.id === schoolId ? { ...s, status: nextStatus } : s));
      logAction(`Updated ${schoolName} status to ${nextStatus}`);
    }
  };

  // Matrix Feature Local Toggle
  const handleToggleFeatureLocal = (featureKey) => {
    if (!selectedMatrixSchoolId) return;

    const currentEdits = {
      ...defaultFeatures,
      ...(featuresData[selectedMatrixSchoolId] || {}),
      ...(matrixEdits[selectedMatrixSchoolId] || {})
    };

    const updatedFeatures = { 
      ...currentEdits, 
      [featureKey]: !currentEdits[featureKey] 
    };

    setMatrixEdits(prev => ({
      ...prev,
      [selectedMatrixSchoolId]: updatedFeatures
    }));
    setSuccessMessage('');
  };

  // Publish Matrix to Supabase
  const handlePublishMatrix = async () => {
    if (!selectedMatrixSchoolId) return;

    const schoolEdits = {
      ...defaultFeatures,
      ...(featuresData[selectedMatrixSchoolId] || {}),
      ...(matrixEdits[selectedMatrixSchoolId] || {})
    };
    const activeSchool = schools.find(s => s.id === selectedMatrixSchoolId);

    const { error } = await supabase
      .from('school_features')
      .upsert({ 
        school_id: selectedMatrixSchoolId, 
        features: schoolEdits, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'school_id' });

    if (error) {
      alert("Error publishing feature matrix: " + error.message);
    } else {
      setFeaturesData(prev => ({ ...prev, [selectedMatrixSchoolId]: schoolEdits }));
      setSuccessMessage(`Successfully published feature matrix for ${activeSchool?.name || 'School'}!`);
      await logAction(`Published updated feature matrix for school: ${activeSchool?.name}`);
    }
  };

  const updateBugStatus = async (bugId, newStatus) => {
    const { error } = await supabase.from('bug_reports').update({ status: newStatus }).eq('id', bugId);
    if (!error) {
      setBugReports(bugReports.map(b => b.id === bugId ? { ...b, status: newStatus } : b));
      logAction(`Updated bug #${bugId} status to '${newStatus}'`);
    }
  };

  const addTodo = async (e) => {
    e.preventDefault();
    if (!newTodoTitle.trim()) return;
    const newItem = { type: newTodoType, title: newTodoTitle, assignee: currentEmployee, status: 'Pending' };
    const { data, error } = await supabase.from('employee_todos').insert([newItem]).select();
    if (!error && data) {
      setTodos([data[0], ...todoItems]);
      logAction(`Added new ${newTodoType.toLowerCase()}: "${newTodoTitle}"`);
      setNewTodoTitle('');
    }
  };

  const completeTodo = async (todoId, todoTitle) => {
    const { error } = await supabase.from('employee_todos').delete().eq('id', todoId);
    if (!error) {
      setTodos(todoItems.filter(t => t.id !== todoId));
      logAction(`Completed and removed item: "${todoTitle}"`);
    }
  };

  const activeMatrixSchoolObj = schools.find(s => s.id === selectedMatrixSchoolId);
  const currentMatrixFeatures = {
    ...defaultFeatures,
    ...(featuresData[selectedMatrixSchoolId] || {}),
    ...(matrixEdits[selectedMatrixSchoolId] || {})
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col font-sans">
      <SuperAdminNavbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        
        {/* ================= 1. SCHOOLS TAB ================= */}
        {activeTab === 'schools' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0b0f19] p-4 rounded-xl border border-gray-800">
              <input
                type="text"
                placeholder="Search pilot, contract, pending, renewal..."
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-sm rounded-lg px-4 py-2 w-full sm:w-80 focus:outline-none focus:border-indigo-500 text-white"
              />
              <div className="flex items-center space-x-2 w-full sm:w-auto overflow-x-auto">
                {['All', 'Pilot', 'Contract', 'Pending', 'Due for renewal'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setSchoolStatusFilter(status)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      schoolStatusFilter === status ? 'bg-indigo-600 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#0b0f19] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-900/50">
                    <th className="p-4">School Name</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Students</th>
                    <th className="p-4">Renewal Date</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 text-sm">
                  {schools
                    .filter(s => schoolStatusFilter === 'All' || s.status === schoolStatusFilter)
                    .filter(s => s.name.toLowerCase().includes(schoolSearch.toLowerCase()))
                    .map((school) => (
                      <tr key={school.id} className="hover:bg-gray-900/40 transition-colors">
                        <td className="p-4 font-medium text-gray-200">{school.name}</td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                            school.status === 'Contract' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            school.status === 'Pilot' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                            school.status === 'Pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {school.status}
                          </span>
                        </td>
                        <td className="p-4 text-gray-300">{school.students || 'N/A'}</td>
                        <td className="p-4 text-gray-300">{school.renewal_date || 'N/A'}</td>
                        <td className="p-4 text-right space-x-2">
                          <button 
                            onClick={() => {
                              const nextStatus = school.status === 'Pilot' ? 'Contract' : 'Due for renewal';
                              updateSchoolStatus(school.id, school.name, nextStatus);
                            }}
                            className="text-xs bg-gray-800 hover:bg-gray-700 text-indigo-300 px-3 py-1.5 rounded-md border border-gray-700 transition-colors cursor-pointer"
                          >
                            Cycle Status
                          </button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================= 2. INVITES TAB ================= */}
        {activeTab === 'invites' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#0b0f19] border border-gray-800 rounded-xl p-6 space-y-4 shadow-xl h-fit">
              <div>
                <h3 className="text-base font-bold text-white">Invite School Principal</h3>
                <p className="text-xs text-gray-400 mt-1">Registers school slug, assigns admin role, and emails a password reset link.</p>
              </div>
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Principal's Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Dr. Jane Doe"
                    value={invitePrincipalName}
                    onChange={(e) => setInvitePrincipalName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">School Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Oakridge High"
                    value={inviteSchoolName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setInviteSchoolName(val);
                      setInviteSchoolSlug(val.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-'));
                    }}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">School URL Slug</label>
                  <input
                    type="text"
                    placeholder="e.g., oakridge-high"
                    value={inviteSchoolSlug}
                    onChange={(e) => setInviteSchoolSlug(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    placeholder="principal@oakridge.edu"
                    value={inviteContactEmail}
                    onChange={(e) => setInviteContactEmail(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-lg cursor-pointer"
                >
                  Send Admin Invite & Register School
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#0b0f19] border border-gray-800 rounded-xl p-6 space-y-4 shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-white">Registered Schools & Admin Access Directory</h3>
                <p className="text-xs text-gray-400">Overview of all active school portals connected to the Seedora network.</p>
              </div>
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {schools.map((s) => (
                  <div key={s.id} className="bg-gray-900/60 border border-gray-800/80 p-4 rounded-xl flex items-center justify-between">
                    <div>
                      <span className="text-xs text-indigo-400 font-mono font-semibold uppercase">{s.status}</span>
                      <h4 className="text-sm font-bold text-white">{s.name}</h4>
                      <span className="text-xs text-gray-400">Route URL: /{s.slug || (s.name || '').toLowerCase().replace(/\s+/g, '-')}/admin</span>
                    </div>
                    <button
                      onClick={() => handleDeleteSchool(s.id, s.name)}
                      className="text-xs bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= 3. FEATURE MATRIX TAB ================= */}
        {activeTab === 'matrix' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#0b0f19] border border-gray-800 rounded-xl p-5 space-y-4 shadow-xl">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Select Registered School</h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {schools.map(s => (
                  <button
                    key={s.id}
                    onClick={() => setSelectedMatrixSchoolId(s.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      selectedMatrixSchoolId === s.id ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-300' : 'bg-gray-900/60 hover:bg-gray-900 text-gray-300 border border-gray-800'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-[#0b0f19] border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Feature Access Matrix</h3>
                  <p className="text-xs text-gray-400 mt-1">Configure module toggles for <span className="text-indigo-400 font-medium">{activeMatrixSchoolObj?.name || 'Selected School'}</span>.</p>
                </div>
                <button
                  type="button"
                  onClick={handlePublishMatrix}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer shadow-lg shadow-emerald-900/20"
                >
                  Publish Changes
                </button>
              </div>

              {successMessage && (
                <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs">
                  {successMessage}
                </div>
              )}

              <div className="space-y-6 max-h-[550px] overflow-y-auto pr-2">
                {/* Parents Section */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3">Parents Portal Features</h4>
                  <div className="space-y-3">
                    {Object.entries(currentMatrixFeatures)
                      .filter(([key]) => key.startsWith('parent'))
                      .map(([featureKey, isEnabled]) => (
                        <div key={featureKey} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-800 bg-[#07090e] hover:border-gray-700 transition-colors">
                          <div>
                            <span className="text-sm font-medium text-white capitalize">{featureKey.replace(/^parent/, '').replace(/([A-Z])/g, ' $1')}</span>
                            <p className="text-[11px] text-gray-400 mt-0.5">Toggles visibility and availability on parent portal.</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleToggleFeatureLocal(featureKey)} 
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${isEnabled ? 'bg-indigo-600' : 'bg-gray-800'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Teachers Section */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 mt-6">Teachers Portal Features</h4>
                  <div className="space-y-3">
                    {Object.entries(currentMatrixFeatures)
                      .filter(([key]) => key.startsWith('teacher'))
                      .map(([featureKey, isEnabled]) => (
                        <div key={featureKey} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-800 bg-[#07090e] hover:border-gray-700 transition-colors">
                          <div>
                            <span className="text-sm font-medium text-white capitalize">{featureKey.replace(/^teacher/, '').replace(/([A-Z])/g, ' $1')}</span>
                            <p className="text-[11px] text-gray-400 mt-0.5">Toggles visibility and availability on teacher portal.</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleToggleFeatureLocal(featureKey)} 
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${isEnabled ? 'bg-indigo-600' : 'bg-gray-800'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                    ))}
                  </div>
                </div>

                {/* Admin & Core Section */}
                <div>
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-3 mt-6">Admin & Core Platform Features</h4>
                  <div className="space-y-3">
                    {Object.entries(currentMatrixFeatures)
                      .filter(([key]) => key.startsWith('admin'))
                      .map(([featureKey, isEnabled]) => (
                        <div key={featureKey} className="flex items-center justify-between p-3.5 rounded-xl border border-gray-800 bg-[#07090e] hover:border-gray-700 transition-colors">
                          <div>
                            <span className="text-sm font-medium text-white capitalize">{featureKey.replace(/^admin/, '').replace(/([A-Z])/g, ' $1')}</span>
                            <p className="text-[11px] text-gray-400 mt-0.5">Toggles visibility and availability on admin console.</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => handleToggleFeatureLocal(featureKey)} 
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${isEnabled ? 'bg-indigo-600' : 'bg-gray-800'}`}
                          >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= 4. BUG REPORTS TAB ================= */}
        {activeTab === 'bugs' && (
          <div className="bg-[#0b0f19] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-gray-800 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white">System Bug Tracker</h3>
                <p className="text-xs text-gray-400">Track triggering school, route, role, and progress statuses.</p>
              </div>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-900/50">
                  <th className="p-4">School</th>
                  <th className="p-4">Route / Page</th>
                  <th className="p-4">Trigger Role</th>
                  <th className="p-4">Issue Description</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Update Progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-sm">
                {bugReports.map((bug) => (
                  <tr key={bug.id} className="hover:bg-gray-900/40">
                    <td className="p-4 font-medium text-gray-200">{bug.school}</td>
                    <td className="p-4 text-indigo-300 font-mono text-xs">{bug.page}</td>
                    <td className="p-4 text-gray-300">{bug.role}</td>
                    <td className="p-4 text-gray-300 max-w-xs truncate">{bug.issue}</td>
                    <td className="p-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        bug.status === 'Complete' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        bug.status === 'Investigating' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                      }`}>
                        {bug.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <select
                        value={bug.status}
                        onChange={(e) => updateBugStatus(bug.id, e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-xs rounded-lg px-2.5 py-1.5 text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="Active">Active</option>
                        <option value="Investigating">Investigating</option>
                        <option value="Complete">Complete</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ================= 5. TO DO LIST TAB ================= */}
        {activeTab === 'todo' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-[#0b0f19] border border-gray-800 rounded-xl p-5 space-y-4 shadow-xl h-fit">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Add Team Task / Request</h3>
              <form onSubmit={addTodo} className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Item Category</label>
                  <select
                    value={newTodoType}
                    onChange={(e) => setNewTodoType(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Task">Daily Task</option>
                    <option value="Custom Request">Custom Feature Request</option>
                    <option value="Bug Item">Active Bug Item</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Description / Task Name</label>
                  <input
                    type="text"
                    placeholder="e.g., Follow up lead with school"
                    value={newTodoTitle}
                    onChange={(e) => setNewTodoTitle(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2.5 text-sm text-gray-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 rounded-lg transition-colors shadow-lg cursor-pointer"
                >
                  Post to Employee Board
                </button>
              </form>
            </div>

            <div className="lg:col-span-2 bg-[#0b0f19] border border-gray-800 rounded-xl p-6 space-y-4 shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-white">Seedora Employee Operations Board</h3>
                <p className="text-xs text-gray-400">Manage daily tasks, client leads, and custom requests.</p>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {todoItems.map((item) => (
                  <div key={item.id} className="bg-gray-900/60 border border-gray-800/80 p-4 rounded-xl flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          item.type === 'Task' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          item.type === 'Custom Request' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {item.type}
                        </span>
                        <span className="text-xs text-gray-400">Assignee: {item.assignee}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-200">{item.title}</p>
                    </div>
                    <button
                      onClick={() => completeTodo(item.id, item.title)}
                      className="text-xs bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Complete
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ================= 6. AUDIT LOGS TAB ================= */}
        {activeTab === 'audit' && (
          <div className="bg-[#0b0f19] border border-gray-800 rounded-xl overflow-hidden shadow-xl">
            <div className="p-5 border-b border-gray-800">
              <h3 className="text-lg font-bold text-white">System & Compliance Audit Trail</h3>
              <p className="text-xs text-gray-400">Automatically logs all database changes paired with the employee's name and exact timestamp.</p>
            </div>
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-gray-900/50">
                  <th className="p-4">Employee Name</th>
                  <th className="p-4">Action Performed</th>
                  <th className="p-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-sm font-mono">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-900/40">
                    <td className="p-4 text-indigo-400 font-semibold">{log.employee}</td>
                    <td className="p-4 text-gray-300 font-sans">{log.action}</td>
                    <td className="p-4 text-right text-xs text-gray-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </main>
    </div>
  );
}