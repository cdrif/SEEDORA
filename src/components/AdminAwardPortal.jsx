import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Award, CheckCircle, FileText, Printer, Shield } from 'lucide-react';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

export default function AdminAwardPortal({ schoolSlug }) {
  const [candidates, setCandidates] = useState([]);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [principalSignature, setPrincipalSignature] = useState('');
  const [schoolConfig, setSchoolConfig] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, [schoolSlug]);

  async function fetchAdminData() {
    const { data: config } = await supabase
      .from('school_config')
      .select('*')
      .eq('school_slug', schoolSlug)
      .single();
    if (config) setSchoolConfig(config);

    const { data } = await supabase
      .from('monthly_leaders')
      .select('*, profiles(full_name, grade), teachers:profiles!monthly_leaders_teacher_id_fkey(full_name)')
      .eq('school_slug', schoolSlug);

    if (data) setCandidates(data);
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-xl border border-slate-700 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Shield className="text-cyan-400"/> Principal & Admin Award Management</h2>
          <p className="text-sm text-slate-400">Tenant Scope: <span className="text-cyan-400 font-mono">{schoolSlug}</span></p>
        </div>
        <button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 px-4 py-2 rounded text-sm flex items-center gap-2">
          <Printer size={16}/> Print Certificate
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Candidate Selector list */}
        <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700 space-y-2">
          <h3 className="text-sm font-semibold text-slate-300">Select Candidate Record</h3>
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {candidates.map(c => (
              <div key={c.id} onClick={() => setSelectedCandidate(c)}
                   className={`p-2 rounded text-sm cursor-pointer transition-colors ${selectedCandidate?.id === c.id ? 'bg-cyan-950 text-cyan-200 border border-cyan-500' : 'bg-slate-900 hover:bg-slate-800'}`}>
                <p className="font-semibold">{c.profiles?.full_name}</p>
                <p className="text-xs text-slate-400">Grade {c.profiles?.grade}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Certificate Preview / Editor Pane */}
        <div className="md:col-span-2 bg-slate-950 p-6 rounded-lg border border-slate-700 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <span className="text-xs uppercase tracking-widest text-slate-500 font-mono">Certificate Generator View</span>
            {schoolConfig?.logo_url && <img src={schoolConfig.logo_url} alt="Logo" className="h-8 w-8 object-contain"/>}
          </div>

          {selectedCandidate ? (
            <div className="bg-white text-slate-900 p-8 rounded border-8 border-double border-amber-600 space-y-4 text-center relative">
              <h3 className="text-2xl font-serif font-bold text-amber-700">Certificate of Academic Excellence</h3>
              <p className="text-xs text-slate-500">{schoolConfig?.school_name || 'Academic Institution'}</p>
              
              <div className="py-2">
                <p className="text-xs uppercase text-slate-500">This is proudly presented to</p>
                <p className="text-2xl font-bold font-serif text-slate-900 mt-1">{selectedCandidate.profiles?.full_name}</p>
                <p className="text-sm text-slate-600 mt-1">Grade {selectedCandidate.profiles?.grade}</p>
              </div>

              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-left text-xs text-slate-700 space-y-1">
                <p className="font-semibold text-amber-800">Teacher's Remark:</p>
                <p className="italic">"{selectedCandidate.teacher_remark || 'Exemplary academic effort and dedication throughout the monthly cycle.'}"</p>
              </div>

              <div className="flex justify-between items-end pt-6 text-xs text-slate-600">
                <div>
                  <p className="border-t border-slate-400 pt-1 font-mono">Teacher Verified</p>
                </div>
                <div>
                  <p className="border-t border-slate-400 pt-1 font-mono">{principalSignature || '[ Principal Signature Slot ]'}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-sm">
              Select a candidate from the left panel to preview and print their official certificate.
            </div>
          )}

          <div className="pt-2">
            <label className="text-xs text-slate-400 block mb-1">Ingest Principal Digital Signature / Name</label>
            <input type="text" className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200" placeholder="e.g. Dr. Arthur Vance, Principal" value={principalSignature} onChange={e => setPrincipalSignature(e.target.value)}/>
          </div>
        </div>
      </div>
    </div>
  );
}