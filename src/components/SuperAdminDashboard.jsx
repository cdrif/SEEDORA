import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SuperAdminHeader from './SuperAdminHeader';
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

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('schools');
  
  // Data states
  const [schools, setSchools] = useState([]);
  const [logs, setLogs] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [todos, setTodos] = useState([]);
  const [featuresData, setFeaturesData] = useState({});
  const [matrixEdits, setMatrixEdits] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // UI states
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [selectedSchoolId, setSelectedSchoolId] = useState('');
  
  // Form states
  const [form, setForm] = useState({ principal: '', school: '', slug: '', email: '' });
  const [todoForm, setTodoForm] = useState({ type: 'Task', title: '' });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setErrorMessage('');
    try {
      const [schoolsRes, logsRes, bugsRes, todosRes, featuresRes] = await Promise.all([
        supabase.from('schools').select('*'),
        supabase.from('audit_logs').select('*').order('created_at', { ascending: false }),
        supabase.from('bug_reports').select('*'),
        supabase.from('employee_todos').select('*'),
        supabase.from('school_features').select('*')
      ]);

      const sData = schoolsRes.data || [];
      const lData = logsRes.data || [];
      const bData = bugsRes.data || [];
      const tData = todosRes.data || [];
      const fData = featuresRes.data || [];

      setSchools(sData);
      setLogs(lData);
      setBugs(bData);
      setTodos(tData);

      // Map features by school_id, safely merging with defaults
      const featureMap = {};
      fData.forEach(row => {
        featureMap[row.school_id] = { ...defaultFeatures, ...(row.features || {}) };
      });
      setFeaturesData(featureMap);
      setMatrixEdits(featureMap);

      if (sData.length > 0 && !selectedSchoolId) {
        setSelectedSchoolId(sData[0].id);
      }
    } catch (err) {
      console.error("Database load error:", err);
      setErrorMessage("Error connecting to Supabase tables. Check your database schema.");
    }
  };

  const recordAudit = async (actionDescription) => {
    const entry = { 
      employee: 'Admin User', 
      action: actionDescription, 
      timestamp: new Date().toISOString() 
    };
    const { error } = await supabase.from('audit_logs').insert([entry]);
    if (!error) {
      setLogs(prevLogs => [entry, ...prevLogs]);
    }
  };

  const handleCycleStatus = async (school) => {
    const nextStatus = school.status === 'Pilot' ? 'Contract' : 'Due for renewal';
    const { error } = await supabase
      .from('schools')
      .update({ status: nextStatus })
      .eq('id', school.id);

    if (!error) {
      setSchools(prev => prev.map(item => item.id === school.id ? { ...item, status: nextStatus } : item));
      recordAudit(`Updated ${school.name} status to ${nextStatus}`);
    } else {
      alert("Error updating status: " + error.message);
    }
  };

  const handleToggleFeatureLocal = (featureKey) => {
    if (!selectedSchoolId) return;

    const currentEdits = {
      ...defaultFeatures,
      ...(featuresData[selectedSchoolId] || {}),
      ...(matrixEdits[selectedSchoolId] || {})
    };

    const updatedFeatures = { 
      ...currentEdits, 
      [featureKey]: !currentEdits[featureKey] 
    };

    setMatrixEdits(prev => ({
      ...prev,
      [selectedSchoolId]: updatedFeatures
    }));
    setSuccessMessage('');
  };

  const handlePublishMatrix = async () => {
    if (!selectedSchoolId) return;

    const schoolEdits = {
      ...defaultFeatures,
      ...(featuresData[selectedSchoolId] || {}),
      ...(matrixEdits[selectedSchoolId] || {})
    };
    const activeSchool = schools.find(s => s.id === selectedSchoolId);

    const { error } = await supabase
      .from('school_features')
      .upsert({ 
        school_id: selectedSchoolId, 
        features: schoolEdits, 
        updated_at: new Date().toISOString() 
      }, { onConflict: 'school_id' });

    if (error) {
      setErrorMessage("Error publishing feature matrix: " + error.message);
    } else {
      setFeaturesData(prev => ({ ...prev, [selectedSchoolId]: schoolEdits }));
      setSuccessMessage(`Successfully published feature matrix for ${activeSchool?.name || 'School'}!`);
      await recordAudit(`Published updated feature matrix for school: ${activeSchool?.name}`);
    }
  };

  const handleSchoolNameChange = (e) => {
    const val = e.target.value;
    const generatedSlug = val.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');
    setForm(prev => ({
      ...prev,
      school: val,
      slug: generatedSlug
    }));
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!form.principal.trim() || !form.school.trim() || !form.email.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    const finalSlug = form.slug && form.slug.trim() !== '' 
      ? form.slug 
      : form.school.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-');

    const { data: schoolData, error: insertError } = await supabase
      .from('schools')
      .insert([{ 
        name: form.school.trim(),
        slug: finalSlug.trim(),
        status: 'Contract'
      }])
      .select('id, slug')
      .single();

    if (insertError) {
      alert("Database Error: " + insertError.message);
      return;
    }

    await supabase
      .from('profiles')
      .upsert([{
        email: form.email.trim().toLowerCase(),
        full_name: form.principal.trim(),
        role: 'admin',
        school_id: schoolData.id,
        updated_at: new Date().toISOString()
      }], { onConflict: 'email' });

    if (schoolData?.id) {
      await supabase.from('school_features').upsert({
        school_id: schoolData.id,
        features: defaultFeatures,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_id' });
    }

    const { error: authError } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { 
      redirectTo: `${window.location.origin}/update-password` 
    });

    if (authError) {
      alert("Auth Invite Error: " + authError.message);
      return;
    }

    await recordAudit(`Invited principal ${form.principal} for school ${form.school}`);
    alert('School registered and invite sent successfully!');
    setForm({ principal: '', school: '', slug: '', email: '' });
    loadDashboardData();
  };

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!todoForm.title.trim()) return;

    const { data, error } = await supabase
      .from('employee_todos')
      .insert([{ ...todoForm, assignee: 'Admin User', status: 'Pending' }])
      .select();

    if (!error && data?.length > 0) {
      setTodos(prev => [data[0], ...prev]);
      setTodoForm(prev => ({ ...prev, title: '' }));
      recordAudit(`Added task: "${todoForm.title}"`);
    }
  };

  const handleDeleteTodo = async (id) => {
    const { error } = await supabase.from('employee_todos').delete().eq('id', id);
    if (!error) {
      setTodos(prev => prev.filter(x => x.id !== id));
    }
  };

  const visibleSchools = schools.filter(s => 
    (filter === 'All' || s.status === filter) && 
    (s.name || '').toLowerCase().includes(search.toLowerCase())
  );

  const activeSchoolObj = schools.find(s => s.id === selectedSchoolId);
  
  const currentMatrix = {
    ...defaultFeatures,
    ...(featuresData[selectedSchoolId] || {}),
    ...(matrixEdits[selectedSchoolId] || {})
  };

  return (
    <div className="min-h-screen bg-[#07090e] text-gray-100 font-sans flex flex-col">
      <SuperAdminHeader activeTab={tab} setActiveTab={setTab} />
      
      <main className="mx-auto max-w-7xl w-full space-y-6 p-6 flex-1">
        {errorMessage && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 p-4 rounded-xl text-sm">
            {errorMessage}
          </div>
        )}

        {tab === 'schools' && (
          <section className="space-y-4">
            <div className="flex flex-wrap gap-3 rounded-xl border border-gray-800 bg-[#0b0f19] p-4 items-center justify-between">
              <input 
                placeholder="Search schools..." 
                value={search} 
                onChange={e => setSearch(e.target.value)} 
                className="rounded-lg border border-gray-700 bg-gray-900 p-2 text-sm text-white w-full sm:w-72 focus:outline-none focus:border-indigo-500" 
              />
              <div className="flex flex-wrap gap-2">
                {['All', 'Pilot', 'Contract', 'Pending', 'Due for renewal'].map(val => (
                  <button 
                    key={val} 
                    onClick={() => setFilter(val)} 
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors ${
                      filter === val ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            <Table>
              {visibleSchools.length === 0 ? (
                <tr><td colSpan="5" className="p-6 text-center text-gray-500">No schools found in database.</td></tr>
              ) : (
                visibleSchools.map(s => (
                  <tr key={s.id} className="hover:bg-gray-900/40">
                    <td className="p-4 font-medium text-white">{s.name}</td>
                    <td className="p-4">{s.status || 'Active'}</td>
                    <td className="p-4">{s.students || 0}</td>
                    <td className="p-4">{s.renewal_date || 'N/A'}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => handleCycleStatus(s)} className="text-indigo-400 hover:text-indigo-300 text-xs cursor-pointer">
                        Cycle Status
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </Table>
          </section>
        )}

        {tab === 'invites' && (
          <Card title="Invite School Principal & Register School">
            <form onSubmit={handleInvite} className="space-y-4 max-w-md">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Principal Name</label>
                <input required value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} placeholder="Dr. Jane Doe" className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">School Name</label>
                <input required value={form.school} onChange={handleSchoolNameChange} placeholder="Oakridge High" className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2.5 text-sm text-white" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">URL Slug</label>
                <input required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="oakridge-high" className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2.5 text-sm text-white font-mono" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="principal@oakridge.edu" className="w-full rounded-lg border border-gray-700 bg-gray-900 p-2.5 text-sm text-white" />
              </div>
              <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium cursor-pointer text-white hover:bg-indigo-500">Send Admin Invite & Register School</button>
            </form>
          </Card>
        )}

        {tab === 'matrix' && (
          <Card title={`Feature Access Matrix: ${activeSchoolObj?.name || 'Select school'}`}>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <select 
                value={selectedSchoolId} 
                onChange={e => setSelectedSchoolId(e.target.value)} 
                className="rounded-lg bg-gray-900 border border-gray-700 p-2.5 text-sm text-white w-full max-w-xs"
              >
                {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              
              <button 
                type="button"
                onClick={handlePublishMatrix}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer shadow-lg shadow-emerald-900/20"
              >
                Publish Changes
              </button>
            </div>

            {successMessage && (
              <div className="mb-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs">
                {successMessage}
              </div>
            )}

            <div className="space-y-3 max-h-[550px] overflow-y-auto pr-2">
              {Object.entries(currentMatrix).map(([key, val]) => (
                <div 
                  key={key} 
                  className="flex items-center justify-between p-3.5 rounded-xl border border-gray-800 bg-[#07090e] hover:border-gray-700 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-white capitalize">
                      {key.replace(/([A-Z])/g, ' $1')}
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Toggles visibility and availability on student/staff nav bar.
                    </p>
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => handleToggleFeatureLocal(key)} 
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                      val ? 'bg-indigo-600' : 'bg-gray-800'
                    }`}
                  >
                    <span 
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        val ? 'translate-x-6' : 'translate-x-1'
                      }`} 
                    />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {tab === 'bugs' && (
          <Table>
            {bugs.length === 0 ? (
              <tr><td className="p-6 text-center text-gray-500">No bug reports logged.</td></tr>
            ) : (
              bugs.map(b => (
                <tr key={b.id} className="hover:bg-gray-900/40">
                  <td className="p-4 font-medium text-white">{b.school}</td>
                  <td className="p-4 text-indigo-400 font-mono text-xs">{b.page}</td>
                  <td className="p-4">{b.role}</td>
                  <td className="p-4 max-w-xs truncate">{b.issue}</td>
                  <td className="p-4 text-right">{b.status}</td>
                </tr>
              ))
            )}
          </Table>
        )}

        {tab === 'todo' && (
          <div className="space-y-6">
            <Card title="Add Task">
              <form onSubmit={handleAddTodo} className="flex gap-2 flex-wrap">
                <select value={todoForm.type} onChange={e => setTodos({ ...todos, type: e.target.value })} className="bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-sm text-white">
                  <option>Task</option>
                  <option>Custom Request</option>
                  <option>Bug</option>
                </select>
                <input value={todoForm.title} onChange={e => setTodoForm({ ...todoForm, title: e.target.value })} placeholder="Task description..." className="flex-1 min-w-[200px] bg-gray-900 border border-gray-700 p-2.5 rounded-lg text-sm text-white" />
                <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">Post</button>
              </form>
            </Card>
            <Table>
              {todos.length === 0 ? (
                <tr><td className="p-6 text-center text-gray-500">No tasks on the board.</td></tr>
              ) : (
                todos.map(item => (
                  <tr key={item.id} className="hover:bg-gray-900/40">
                    <td className="p-4 font-semibold text-xs text-indigo-400">{item.type}</td>
                    <td className="p-4 text-white">{item.title}</td>
                    <td className="p-4 text-gray-400 text-xs">{item.assignee}</td>
                    <td className="p-4 text-right">
                      <button type="button" onClick={() => handleDeleteTodo(item.id)} className="text-emerald-400 hover:text-emerald-300 text-xs cursor-pointer">
                        Complete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </Table>
          </div>
        )}

        {tab === 'audit' && (
          <Table>
            {logs.length === 0 ? (
              <tr><td className="p-6 text-center text-gray-500">No audit logs recorded.</td></tr>
            ) : (
              logs.map((log, i) => (
                <tr key={log.id || i} className="hover:bg-gray-900/40">
                  <td className="p-4 font-semibold text-indigo-400">{log.employee}</td>
                  <td className="p-4 text-gray-300">{log.action}</td>
                  <td className="p-4 text-right text-xs font-mono text-gray-500">{new Date(log.timestamp).toLocaleString()}</td>
                </tr>
              ))
            )}
          </Table>
        )}
      </main>
    </div>
  );
}

const Card = ({ title, children }) => (
  <div className="rounded-xl border border-gray-800 bg-[#0b0f19] p-5 shadow-xl">
    <h2 className="mb-4 text-lg font-bold text-white">{title}</h2>
    {children}
  </div>
);

const Table = ({ children }) => (
  <div className="overflow-x-auto rounded-xl border border-gray-800 bg-[#0b0f19] shadow-xl">
    <table className="w-full text-left border-collapse">
      <tbody className="divide-y divide-gray-800/60 text-sm text-gray-300">
        {children}
      </tbody>
    </table>
  </div>
);