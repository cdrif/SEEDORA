import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Award, CheckCircle, FileText, Printer, Shield } from 'lucide-react';
import GlobalHeader from './GlobalHeader';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

export default function AdminAwardPortal({ schoolSlug }) {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedCandidateId, setSelectedCandidateId] = useState('ALL');
  
  const [schoolConfig, setSchoolConfig] = useState(null);
  const [principalSignature, setPrincipalSignature] = useState('');
  const [savingSig, setSavingSig] = useState(false);

  const printRef = useRef();

  useEffect(() => {
    async function fetchAdminData() {
      try {
        const { data: config } = await supabase
          .from('school_config')
          .select('*')
          .eq('school_slug', schoolSlug)
          .single();
        if (config) {
          setSchoolConfig(config);
          setPrincipalSignature(config.principal_signature || '');
        }

        const { data, error } = await supabase
          .from('monthly_leaders')
          .select('*, profiles(full_name, grade), teachers:profiles!monthly_leaders_teacher_id_fkey(full_name)')
          .eq('school_slug', schoolSlug);

        if (error) throw error;
        setCandidates(data || []);
      } catch (err) {
        console.error('Error loading Admin Award Portal:', err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAdminData();
  }, [schoolSlug]);

  // Save Principal Signature
  const handleSavePrincipalSignature = async (e) => {
    e.preventDefault();
    setSavingSig(true);
    try {
      const { error } = await supabase.from('school_config').upsert({
        school_slug: schoolSlug,
        principal_signature: principalSignature,
        updated_at: new Date().toISOString()
      }, { onConflict: 'school_slug' });

      if (error) throw error;
      alert('Principal signature locked successfully.');
    } catch (err) {
      alert('Error saving signature: ' + err.message);
    } finally {
      setSavingSig(false);
    }
  };

  // Filter candidates based on dropdown selections
  const filteredCandidates = candidates.filter(c => {
    const gradeMatch = selectedGrade === 'ALL' || String(c.profiles?.grade) === String(selectedGrade);
    const candidateMatch = selectedCandidateId === 'ALL' || c.id === selectedCandidateId;
    return gradeMatch && candidateMatch;
  });

  const handlePrint = () => {
    window.print();
  };

  const availableGrades = [...new Set(candidates.map(c => c.profiles?.grade))].filter(Boolean);

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
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Shield className="text-cyan-400"/> Principal & Admin Award Management
              </h1>
              <p className="text-sm text-gray-400 mt-1">
                Tenant Scope: <span className="text-cyan-400 font-mono">{schoolSlug}</span> — Review monthly leaders and print certificates.
              </p>
            </div>
            <button 
              onClick={handlePrint}
              disabled={filteredCandidates.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 px-5 rounded-lg text-sm cursor-pointer transition-colors flex items-center gap-2"
            >
              <Printer size={16}/> Print / Export PDF ({filteredCandidates.length} Selected)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-gray-800">
            {/* Grade Filter */}
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Filter by Grade:</label>
              <select 
                value={selectedGrade}
                onChange={(e) => { setSelectedGrade(e.target.value); setSelectedCandidateId('ALL'); }}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
              >
                <option value="ALL">All Grades</option>
                {availableGrades.map(g => <option key={g} value={g}>Grade {g}</option>)}
              </select>
            </div>

            {/* Candidate Filter */}
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Filter by Candidate:</label>
              <select 
                value={selectedCandidateId}
                onChange={(e) => setSelectedCandidateId(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white"
              >
                <option value="ALL">All Candidates in View</option>
                {candidates
                  .filter(c => selectedGrade === 'ALL' || String(c.profiles?.grade) === String(selectedGrade))
                  .map(c => <option key={c.id} value={c.id}>{c.profiles?.full_name || 'Unnamed Candidate'}</option>)}
              </select>
            </div>

            {/* Principal Signature Setup */}
            <div>
              <label className="block text-xs font-mono text-gray-400 mb-1">Principal Digital Signature:</label>
              <form onSubmit={handleSavePrincipalSignature} className="flex gap-2">
                <input 
                  type="text" 
                  value={principalSignature}
                  onChange={(e) => setPrincipalSignature(e.target.value)}
                  placeholder="e.g., Dr. Arthur Vance, Principal"
                  className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-xs text-white font-mono"
                  required
                />
                <button type="submit" disabled={savingSig} className="bg-gray-800 hover:bg-gray-700 text-xs px-3 py-2.5 rounded-lg font-mono">
                  Save
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* CERTIFICATES CONTAINER */}
        {loading ? (
          <div className="text-gray-400 text-center py-12">Loading award candidates...</div>
        ) : filteredCandidates.length === 0 ? (
          <div className="bg-[#111827] border border-gray-800 rounded-xl p-12 text-center text-gray-400">
            No award candidates found matching the selected filters.
          </div>
        ) : (
          <div className="space-y-12" ref={printRef}>
            {filteredCandidates.map((candidate) => (
              <div 
                key={candidate.id} 
                className="bg-white text-slate-900 border-8 border-double border-amber-600 rounded-xl p-10 shadow-md print:shadow-none print:border-8 print:border-double print:border-amber-600 print:p-8 print:mb-16 page-break-after relative"
              >
                {/* Header Logo & Institution */}
                <div className="flex justify-between items-center border-b border-slate-200 pb-4 mb-6">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">Certificate of Academic Excellence</p>
                    <p className="text-sm font-semibold text-slate-700">{schoolConfig?.school_name || 'Academic Institution'}</p>
                  </div>
                  {schoolConfig?.logo_url && (
                    <img src={schoolConfig.logo_url} alt="Logo" className="h-12 w-12 object-contain" />
                  )}
                </div>

                {/* Main Content */}
                <div className="text-center space-y-4 py-6">
                  <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-2">
                    <Award size={32} />
                  </div>
                  <p className="text-xs uppercase tracking-widest text-slate-500 font-mono">This is proudly presented to</p>
                  <h3 className="text-3xl font-serif font-bold text-slate-900 tracking-tight">
                    {candidate.profiles?.full_name}
                  </h3>
                  <p className="text-sm font-medium text-slate-600">
                    Grade {candidate.profiles?.grade}
                  </p>
                </div>

                {/* Teacher Remark Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 my-6 text-sm text-slate-700 space-y-1">
                  <p className="font-semibold text-amber-800 text-xs uppercase tracking-wider">Teacher's Remark:</p>
                  <p className="italic">"{candidate.teacher_remark || 'Exemplary academic effort and dedication throughout the monthly cycle.'}"</p>
                  {candidate.teachers?.full_name && (
                    <p className="text-xs text-right text-slate-500 mt-2 font-mono">— Verified by {candidate.teachers.full_name}</p>
                  )}
                </div>

                {/* Signatures Footer */}
                <div className="grid grid-cols-2 gap-12 pt-8 border-t border-dashed border-slate-300 text-xs mt-8">
                  <div>
                    <div className="h-10 flex items-end font-mono text-slate-700 italic">
                      {candidate.teachers?.full_name || 'Staff Instructor'}
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-slate-600 font-mono">Teacher Verified & Date</div>
                  </div>
                  <div>
                    <div className="h-10 flex items-end font-mono text-slate-800 font-semibold">
                      {principalSignature || '[ Principal Signature Slot ]'}
                    </div>
                    <div className="border-t border-slate-400 pt-1 text-slate-600 font-mono">Principal Signature & Date</div>
                  </div>
                </div>

                <div className="text-center text-[10px] font-mono text-slate-400 mt-8">
                  Official Award Certificate — Seedora School Platform — Printed on: {new Date().toLocaleString()}
                </div>

              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
}