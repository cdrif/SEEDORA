import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Fully restored Super Admin Header
function SuperAdminHeader({ activeTab, setActiveTab }) {
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
  const [currentEmployee, setCurrentEmployee] = useState('Admin User');

  const [schools, setSchools] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [bugReports, setBugReports] = useState([]);
  const [todoItems, setTodos] = useState([]);
  
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolStatusFilter, setSchoolStatusFilter] = useState('All');
  const [selectedMatrixSchool, setSelectedMatrixSchool] = useState('');
  const [featureMatrix, setFeatureMatrix] = useState({});

  // Invite Form State
  const [invitePrincipalName, setInvitePrincipalName] = useState('');
  const [inviteSchoolName, setInviteSchoolName] = useState('');
  const [inviteSchoolSlug, setInviteSchoolSlug] = useState('');
  const [inviteContactEmail, setInviteContactEmail] = useState('');

  // Todo Form State
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoType, setNewTodoType] = useState('Task');

  useEffect(() => {
    fetchSchools();
    fetchAuditLogs();
    fetchBugReports();
    fetchTodos();
  }, []);

  const fetchSchools = async () => {
    const { data, error } = await supabase.from('schools').select('*');
    if (!error && data) {
      setSchools(data);
      if (data.length > 0 && !selectedMatrixSchool) setSelectedMatrixSchool(data[0].name);
    }
  };

  const fetchAuditLogs = async () => {
    const { data, error } = await supabase.from('audit_logs').select('*').order('timestamp', { ascending: false });
    if (!error && data) setAuditLogs(data);
  };

  const fetchBugReports = async () => {
    const { data, error } = await supabase.from('bug_reports').select('*');
    if (!error && data) setBugReports(data);
  };

  const fetchTodos = async () => {
    const { data, error } = await supabase.from('employee_todos').select('*');
    if (!error && data) setTodos(data);
  };

  const logAction = async (actionDescription) => {
    const newLog = { employee: currentEmployee, action: actionDescription, timestamp: new Date().toISOString() };
    await supabase.from('audit_logs').insert([newLog]);
    fetchAuditLogs();
  };

  const handleSendInvite = async (e) => {
    e.preventDefault();
    if (!invitePrincipalName || !inviteSchoolName || !inviteSchoolSlug || !inviteContactEmail) {
      alert('Please fill out all fields to send the invite.');
      return;
    }

    const { error: schoolError } = await supabase.from('schools').insert([{
      name: inviteSchoolName,
      status: 'Contract',
      students: 0,
      renewal_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }]);

    if (schoolError) {
      alert('Error registering school: ' + schoolError.message);
      return;
    }

    const { error: inviteError } = await supabase.auth.resetPasswordForEmail(inviteContactEmail, {
      redirectTo: `${window.location.origin}/${inviteSchoolSlug}/admin`,
    });

    if (inviteError) {
      alert('School registered, but error sending reset email: ' + inviteError.message);
    } else {
      alert(`Successfully invited ${invitePrincipalName} for ${inviteSchoolName} (${inviteSchoolSlug})!`);
    }

    logAction(`Invited principal ${invitePrincipalName} for school ${inviteSchoolName} (Slug: ${inviteSchoolSlug})`);
    
    setInvitePrincipalName('');
    setInviteSchoolName('');
    setInviteSchoolSlug('');
    setInviteContactEmail('');
    fetchSchools();
  };

  const updateSchoolStatus = async (schoolId, schoolName, nextStatus) => {
    const { error } = await supabase.from('schools').update({ status: nextStatus }).eq('id', schoolId);
    if (!error) {
      setSchools(schools.map(s => s.id === schoolId ? { ...s, status: nextStatus } : s));
      logAction(`Updated ${schoolName} status to ${nextStatus}`);
    }
  };

  const handleFeatureToggle = async (featureKey) => {
    const currentFeatures = featureMatrix[selectedMatrixSchool] || { analytics: true, aiTutor: false, sportsPortal: true, parentGateway: true };
    const updatedStatus = !currentFeatures[featureKey];
    setFeatureMatrix({ ...featureMatrix, [selectedMatrixSchool]: { ...currentFeatures, [featureKey]: updatedStatus } });
    logAction(`Toggled feature '${featureKey}' to ${updatedStatus ? 'ON' : 'OFF'} for ${selectedMatrixSchool}`);
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

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 flex flex-col font-sans">
      <SuperAdminHeader activeTab={activeTab} setActiveTab={setActiveTab} />

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
                        <td className="p-4 text-right">
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
                    onChange={(e) => setInviteSchoolName(e.target.value)}
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
                      <span className="text-xs text-gray-400">Route URL: /{(s.name || '').toLowerCase().replace(/\s+/g, '-')}/admin</span>
                    </div>
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
                    onClick={() => setSelectedMatrixSchool(s.name)}
                    className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                      selectedMatrixSchool === s.name ? 'bg-indigo-600/20 border border-indigo-500/50 text-indigo-300' : 'bg-gray-900/60 hover:bg-gray-900 text-gray-300 border border-gray-800'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-2 bg-[#0b0f19] border border-gray-800 rounded-xl p-6 space-y-6 shadow-xl">
              <div>
                <h3 className="text-lg font-bold text-white">Feature Access Matrix</h3>
                <p className="text-xs text-gray-400 mt-1">Configure module toggles for <span className="text-indigo-400 font-medium">{selectedMatrixSchool || 'Selected School'}</span>.</p>
              </div>

              <div className="space-y-4 divide-y divide-gray-800/80">
                {Object.entries(featureMatrix[selectedMatrixSchool] || { analytics: true, aiTutor: false, sportsPortal: true, parentGateway: true }).map(([feature, isEnabled]) => (
                  <div key={feature} className="pt-4 first:pt-0 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold capitalize text-gray-200 block">{feature.replace(/([A-Z])/g, ' $1')}</span>
                      <span className="text-xs text-gray-400">Toggles visibility and availability on student/staff nav bar.</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => handleFeatureToggle(feature)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>
                ))}
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