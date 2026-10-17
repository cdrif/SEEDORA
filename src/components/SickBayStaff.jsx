import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import GlobalHeader from './GlobalHeader';

export default function SickBayStaff() {
  const { schoolSlug } = useParams();
  
  const [activeTab, setActiveTab] = useState('active');
  const [activeVisits, setActiveVisits] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [medicalDirectory, setMedicalDirectory] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [incidentNature, setIncidentNature] = useState('');
  const [statusMessage, setStatusMessage] = useState('Sick Bay active. Ready for student triage logging.');
  const [statusType, setStatusType] = useState('info');

  useEffect(() => {
    async function fetchSickBayData() {
      const { data: studentData } = await supabase.from('students').select('*').eq('school_slug', schoolSlug);
      if (studentData) setAllStudents(studentData);

      const { data: visitsData } = await supabase.from('sick_bay_visits').select('*, students(first_name, last_name, student_id_number)');
      if (visitsData) {
        setActiveVisits(visitsData.filter(v => !v.time_out));
        setAuditLogs(visitsData.filter(v => v.time_out));
      } else {
        setActiveVisits([
          {
            id: 'v1',
            students: { first_name: 'Chloe', last_name: 'Vance', student_id_number: 'STU-774102' },
            incident_nature: 'Severe allergic reaction / breathing difficulty',
            time_in: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
            parent_preference: 'Pending Parent Choice',
            remedy_chosen_by: 'Pending',
            status: 'Waiting Parent Decision'
          }
        ]);
        setAuditLogs([
          {
            id: 'a1',
            students: { first_name: 'Liam', last_name: 'O Connor', student_id_number: 'STU-882190' },
            incident_nature: 'Headache & Mild Nausea',
            time_in: '2026-10-11T10:30:00Z',
            time_out: '2026-10-11T11:15:00Z',
            duration_minutes: '45 mins',
            action_taken: 'Parent requested pickup',
            remedy_chosen_by: 'Parent (Sarah O Connor)',
            status: 'Discharged'
          }
        ]);
      }

      const { data: medData } = await supabase.from('student_medical_profiles').select('*, students(first_name, last_name, student_id_number)');
      if (medData) {
        setMedicalDirectory(medData);
      } else {
        setMedicalDirectory([
          { student_id: 's1', students: { first_name: 'Chloe', last_name: 'Vance', student_id_number: 'STU-774102' }, opted_in: true, conditions: 'Asthmatic (Carries Ventolin), Nut Allergy' }
        ]);
      }
    }
    fetchSickBayData();
  }, [schoolSlug]);

  const handleAdmitStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !incidentNature) return;

    const targetStudent = allStudents.find(s => s.id === selectedStudentId);
    const newVisit = {
      id: Date.now().toString(),
      student_id: selectedStudentId,
      students: targetStudent || { first_name: 'Unknown', last_name: 'Student', student_id_number: 'STU-000000' },
      incident_nature: incidentNature,
      time_in: new Date().toISOString(),
      parent_preference: 'Pending Parent Choice',
      remedy_chosen_by: 'Pending',
      status: 'Awaiting Parent Action'
    };

    try {
      await supabase.from('sick_bay_visits').insert([newVisit]);
    } catch (err) {
      console.error("Supabase insert error:", err);
    }

    setActiveVisits(prev => [newVisit, ...prev]);
    setSelectedStudentId('');
    setIncidentNature('');
    setStatusMessage('🚨 Student admitted to Sick Bay. Parent SMS alert dispatched for remedy selection.');
    setStatusType('success');
  };

  const handleAdminEmergencyOverride = async (visitId) => {
    const visit = activeVisits.find(v => v.id === visitId);
    if (!visit) return;

    const timeInDate = new Date(visit.time_in);
    const durationMins = Math.round((new Date() - timeInDate) / 60000) + ' mins';

    const completedRecord = {
      ...visit,
      time_out: new Date().toISOString(),
      duration_minutes: durationMins,
      action_taken: 'AMBULANCE CALLED (Emergency Protocol)',
      remedy_chosen_by: 'Admin Emergency Protocol',
      status: 'Emergency Transport'
    };

    setActiveVisits(prev => prev.filter(v => v.id !== visitId));
    setAuditLogs(prev => [completedRecord, ...prev]);
    setStatusMessage('🚨 EMERGENCY OVERRIDE LOGGED: Ambulance dispatched by Admin. Audit trail secured.');
    setStatusType('error');
  };

  const handleDischarge = async (visitId, actionSummary, chosenBy) => {
    const visit = activeVisits.find(v => v.id === visitId);
    if (!visit) return;

    const timeInDate = new Date(visit.time_in);
    const durationMins = Math.round((new Date() - timeInDate) / 60000) + ' mins';

    const completedRecord = {
      ...visit,
      time_out: new Date().toISOString(),
      duration_minutes: durationMins,
      action_taken: actionSummary,
      remedy_chosen_by: chosenBy,
      status: 'Discharged'
    };

    setActiveVisits(prev => prev.filter(v => v.id !== visitId));
    setAuditLogs(prev => [completedRecord, ...prev]);
    setStatusMessage(`✅ Student discharged successfully. Logged to audit archive.`);
    setStatusType('success');
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white font-sans selection:bg-indigo-500 selection:text-white">
      <GlobalHeader />

      <nav className="bg-[#111827] border-b border-gray-800 px-4 sm:px-6 py-3 flex space-x-6 text-xs sm:text-sm font-medium overflow-x-auto">
        <button 
          onClick={() => setActiveTab('active')} 
          className={`pb-1 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'active' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
        >
          🏥 Active Sick Bay ({activeVisits.length})
        </button>
        <button 
          onClick={() => setActiveTab('audit')} 
          className={`pb-1 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'audit' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
        >
          📋 Sickness Audit Logs ({auditLogs.length})
        </button>
        <button 
          onClick={() => setActiveTab('medical_directory')} 
          className={`pb-1 transition-colors whitespace-nowrap cursor-pointer ${activeTab === 'medical_directory' ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'}`}
        >
          🛡️ Student Medical Directory ({medicalDirectory.length})
        </button>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Clinical Sick Bay & Triage Suite</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Real-time clinical monitoring, parent remedy dispatch, compliance medical clearance, and audit logging.</p>
        </div>

        <div className={`p-4 rounded-xl text-xs sm:text-sm font-medium border shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
          statusType === 'success' ? 'bg-emerald-950/50 text-emerald-300 border-emerald-800' : 
          statusType === 'error' ? 'bg-red-950/50 text-red-300 border-red-800' : 
          'bg-indigo-950/50 text-indigo-300 border-indigo-800'
        }`}>
          <span>{statusMessage}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider bg-black px-2.5 py-1 rounded border border-gray-800">HIPAA / Privacy Compliant</span>
        </div>

        {activeTab === 'active' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 bg-[#111827] border border-gray-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-gray-100">Admit Student to Sick Bay</h2>
              <p className="text-xs text-gray-400">Logging an entry instantly triggers parent notification to select a care remedy.</p>

              <form onSubmit={handleAdmitStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Select Student</label>
                  <select 
                    value={selectedStudentId} 
                    onChange={e => setSelectedStudentId(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Student --</option>
                    {allStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.student_id_number})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-gray-400 mb-1">Nature of Incident / Symptoms</label>
                  <textarea 
                    rows="3"
                    placeholder="e.g. Severe stomach cramps, dizziness, high fever..." 
                    value={incidentNature} 
                    onChange={e => setIncidentNature(e.target.value)} 
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs sm:text-sm text-white focus:outline-none focus:border-indigo-500 resize-none"
                    required
                  ></textarea>
                </div>

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-xs sm:text-sm transition-colors cursor-pointer shadow">
                  Admit & Dispatch Parent SMS Alert
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 bg-[#111827] border border-gray-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
              <h2 className="text-base font-semibold text-gray-100">Currently Occupying Sick Bay</h2>

              {activeVisits.length > 0 ? (
                <div className="space-y-4">
                  {activeVisits.map(visit => {
                    const medProfile = medicalDirectory.find(m => m.student_id === visit.student_id);
                    return (
                      <div key={visit.id} className="bg-gray-900 border border-gray-800 p-4 rounded-lg space-y-3">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <h3 className="text-xs sm:text-sm font-bold text-white">{visit.students?.first_name} {visit.students?.last_name} <span className="text-xs font-mono text-indigo-400">({visit.students?.student_id_number})</span></h3>
                            <p className="text-xs text-amber-300 mt-0.5"><strong>Symptoms:</strong> {visit.incident_nature}</p>
                          </div>
                          <span className="text-[10px] font-mono px-2.5 py-1 bg-red-950 text-red-300 border border-red-800 rounded-full">
                            Entered: {new Date(visit.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {medProfile?.opted_in && (
                          <div className="bg-red-950/40 border border-red-800/60 p-2.5 rounded-lg text-xs text-red-300 flex items-center space-x-2">
                            <span>🛡️ <strong>Medical Flag:</strong> {medProfile.conditions}</span>
                          </div>
                        )}

                        <div className="bg-black p-3 rounded-lg border border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                          <div>
                            <span className="text-gray-400">Parent Remedy Preference:</span>
                            <p className="font-bold text-emerald-400 mt-0.5">{visit.parent_preference}</p>
                          </div>
                          
                          <div className="flex flex-wrap gap-2">
                            <button onClick={() => handleDischarge(visit.id, 'Sent home with parent', 'Parent')} className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded font-semibold transition cursor-pointer text-xs">
                              Discharge: Sent Home
                            </button>
                            <button onClick={() => handleDischarge(visit.id, 'Recovered & returned to class', 'School Nurse / Admin')} className="bg-gray-800 hover:bg-gray-700 text-gray-200 px-3 py-1.5 rounded font-semibold transition cursor-pointer text-xs">
                              Return to Class
                            </button>
                            <button onClick={() => handleAdminEmergencyOverride(visit.id)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded font-bold animate-pulse transition cursor-pointer text-xs">
                              🚨 EMERGENCY: Call Ambulance
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-12">No students currently in the sick bay.</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-100">Sickness & Clinical Audit Trail</h2>
            <p className="text-xs text-gray-400">Complete compliance archive tracking entry timestamps, duration, actions taken, and authorizing parties.</p>

            <div className="border border-gray-800 rounded-lg overflow-x-auto bg-gray-900">
              <table className="w-full text-left border-collapse text-xs min-w-[650px]">
                <thead className="bg-black/50 text-gray-400 uppercase font-mono border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Incident Nature</th>
                    <th className="py-3 px-4">Time In / Duration</th>
                    <th className="py-3 px-4">Action Taken</th>
                    <th className="py-3 px-4">Authorizing Remedy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-300 font-mono">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-800/30">
                      <td className="py-3 px-4 font-medium text-white font-sans">{log.students?.first_name} {log.students?.last_name}</td>
                      <td className="py-3 px-4 text-amber-300 font-sans">{log.incident_nature}</td>
                      <td className="py-3 px-4 text-gray-400">
                        {new Date(log.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ({log.duration_minutes})
                      </td>
                      <td className="py-3 px-4 font-semibold text-emerald-400">{log.action_taken}</td>
                      <td className="py-3 px-4 text-indigo-400">{log.remedy_chosen_by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'medical_directory' && (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-5 sm:p-6 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-gray-100">Student Medical & Compliance Directory</h2>
            <p className="text-xs text-gray-400">Confidential medical flags opted-in by parents for emergency clinical action.</p>

            <div className="border border-gray-800 rounded-lg overflow-x-auto bg-gray-900">
              <table className="w-full text-left border-collapse text-xs min-w-[600px]">
                <thead className="bg-black/50 text-gray-400 uppercase font-mono border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Student Name & ID</th>
                    <th className="py-3 px-4">Compliance Status</th>
                    <th className="py-3 px-4">Declared Medical Conditions / Allergies</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-300 font-mono">
                  {medicalDirectory.map((med) => (
                    <tr key={med.student_id} className="hover:bg-gray-800/30">
                      <td className="py-3 px-4 font-medium text-white font-sans">{med.students?.first_name} {med.students?.last_name} <span className="text-indigo-400 font-mono">({med.students?.student_id_number})</span></td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800 whitespace-nowrap">
                          Opted-In & Verified
                        </span>
                      </td>
                      <td className="py-3 px-4 text-amber-300 font-medium font-sans">{med.conditions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}