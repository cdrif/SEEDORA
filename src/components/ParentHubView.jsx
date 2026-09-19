import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Award, ShieldCheck, Sparkles, Trophy } from 'lucide-react';

const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

export default function ParentHubView({ schoolSlug }) {
  const [leaders, setLeaders] = useState([]);
  const [schoolInfo, setSchoolInfo] = useState(null);

  useEffect(() => {
    fetchSchoolFeed();
  }, [schoolSlug]);

  async function fetchSchoolFeed() {
    // Fetch school config data for branding/logo
    const { data: config } = await supabase
      .from('school_config')
      .select('school_name, logo_url')
      .eq('school_slug', schoolSlug)
      .single();
    
    if (config) setSchoolInfo(config);

    // Fetch monthly leaders securely for this school scope
    const { data } = await supabase
      .from('monthly_leaders')
      .select('*, profiles(full_name, grade)')
      .eq('school_slug', schoolSlug)
      .order('total_points', { ascending: false });

    if (data) setLeaders(data);
  }

  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-xl border border-slate-700 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Sparkles className="text-amber-400"/> School Community Hub</h2>
          <p className="text-sm text-slate-400">{schoolInfo?.school_name || 'Academic Community Feed'} • Verified Secure Portal</p>
        </div>
        {schoolInfo?.logo_url && <img src={schoolInfo.logo_url} alt="School Logo" className="h-10 w-10 object-contain rounded"/>}
      </div>

      <div className="space-y-4">
        <h3 className="text-md font-semibold text-slate-300 flex items-center gap-2"><Trophy size={18} className="text-amber-400"/> Monthly Academic Honor Roll</h3>
        
        {leaders.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {leaders.map((leader, index) => (
              <div key={leader.id || index} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-start gap-4">
                <div className="bg-amber-500/10 text-amber-400 border border-amber-500/30 p-3 rounded-lg flex items-center justify-center font-bold">
                  #{index + 1}
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-100">{leader.profiles?.full_name}</h4>
                  <p className="text-xs text-slate-400">Grade {leader.profiles?.grade}</p>
                  {leader.teacher_remark && (
                    <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2 rounded mt-2 border border-slate-800">
                      "{leader.teacher_remark}"
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-800/20 rounded-lg border border-slate-800">
            <p className="text-sm text-slate-400">No public honor roll entries published for this cycle yet.</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500 pt-2 border-t border-slate-800">
        <ShieldCheck size={14} className="text-emerald-500"/>
        <span>Data privacy compliant. Managed through teacher-verified school nodes.</span>
      </div>
    </div>
  );
}