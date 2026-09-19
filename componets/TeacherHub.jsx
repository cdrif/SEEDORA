import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Award, CheckCircle, ChevronLeft, ChevronRight, MessageSquare, Send, Trophy, Users } from 'lucide-react';

// Initialize Supabase client (replace with your env variables)
const supabase = createClient(process.env.REACT_APP_SUPABASE_URL, process.env.REACT_APP_SUPABASE_ANON_KEY);

export default function TeacherHub({ schoolSlug, teacherId }) {
  const [students, setStudents] = useState([]);
  const [selectedVotes, setSelectedVotes] = useState([]);
  const [currentLeaders, setCurrentLeaders] = useState([]);
  const [slideIndex, setSlideIndex] = useState(0);
  const [monthlyRemark, setMonthlyRemark] = useState('');
  const [topStudentId, setTopStudentId] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');

  useEffect(() => {
    fetchClassroomData();
    fetchCurrentLeaders();
  }, [schoolSlug, teacherId]);

  async function fetchClassroomData() {
    // Fetch students assigned to this teacher / school slug
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, grade')
      .eq('school_slug', schoolSlug)
      .eq('role', 'student');
    
    if (!error) setStudents(data || []);

    // Fetch existing votes for current period
    const { data: voteData } = await supabase
      .from('votes')
      .eq('teacher_id', teacherId)
      .eq('school_slug', schoolSlug);

    if (voteData) {
      setSelectedVotes(voteData.map(v => v.student_id));
      if (voteData.length > 0) setTopStudentId(voteData[0].student_id);
    }
  }

  async function fetchCurrentLeaders() {
    const { data } = await supabase
      .from('monthly_leaders')
      .select('*, profiles(full_name, grade)')
      .eq('school_slug', schoolSlug)
      .order('total_points', { ascending: false });
    
    if (data) setCurrentLeaders(data);
  }

  const handleVoteToggle = async (studentId) => {
    if (selectedVotes.includes(studentId)) {
      const updated = selectedVotes.filter(id => id !== studentId);
      setSelectedVotes(updated);
      await supabase.from('votes').delete().eq('teacher_id', teacherId).eq('student_id', studentId);
    } else {
      if (selectedVotes.length >= 3) {
        alert('You can only select a maximum of 3 students per month.');
        return;
      }
      const updated = [...selectedVotes, studentId];
      setSelectedVotes(updated);
      await supabase.from('votes').insert([{ teacher_id: teacherId, student_id: studentId, school_slug: schoolSlug }]);
    }
    setStatusMsg('Votes updated successfully.');
    setTimeout(() => setStatusMsg(''), 3000);
  };

  const handleSaveRemark = async () => {
    if (!topStudentId) return alert('Select your top student to attach a remark.');
    const { error } = await supabase
      .from('monthly_leaders')
      .upsert({ 
        school_slug: schoolSlug, 
        student_id: topStudentId, 
        teacher_remark: monthlyRemark,
        teacher_id: teacherId 
      }, { onConflict: ['school_slug', 'student_id'] });

    if (!error) {
      setStatusMsg('Remark submitted to Principal/Admin successfully.');
      setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  return (
    <div className="bg-slate-900 text-slate-100 p-6 rounded-xl border border-slate-700 max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-slate-700 pb-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><Trophy className="text-amber-400"/> Teacher Academic Voting Portal</h2>
          <p className="text-sm text-slate-400">School Scope: <span className="text-cyan-400 font-mono">{schoolSlug}</span></p>
        </div>
        {statusMsg && <span className="text-xs bg-emerald-900/50 text-emerald-300 px-3 py-1 rounded border border-emerald-700">{statusMsg}</span>}
      </div>

      {/* Rotating Slideshow Panel for Leaders */}
      <div className="bg-slate-800/60 p-4 rounded-lg border border-slate-700 relative">
        <h3 className="text-sm font-semibold text-slate-400 mb-2 uppercase tracking-wider flex items-center gap-2"><Users size={16}/> Current Monthly Leaders (School-Wide)</h3>
        {currentLeaders.length > 0 ? (
          <div className="flex items-center justify-between">
            <button onClick={() => setSlideIndex(prev => (prev === 0 ? currentLeaders.length - 1 : prev - 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronLeft/></button>
            <div className="text-center">
              <p className="text-lg font-bold text-amber-300">{currentLeaders[slideIndex]?.profiles?.full_name}</p>
              <p className="text-xs text-slate-400">Grade {currentLeaders[slideIndex]?.profiles?.grade} • Score: {currentLeaders[slideIndex]?.total_points} pts</p>
            </div>
            <button onClick={() => setSlideIndex(prev => (prev === currentLeaders.length - 1 ? 0 : prev + 1))} className="p-1 hover:bg-slate-700 rounded"><ChevronRight/></button>
          </div>
        ) : (
          <p className="text-sm text-slate-500 italic text-center py-2">No tally data available for this cycle yet.</p>
        )}
      </div>

      {/* Student Selection Grid */}
      <div>
        <h3 className="text-md font-semibold mb-3">Select Your Top 3 Academic Students ({selectedVotes.length}/3)</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {students.map(student => {
            const isSelected = selectedVotes.includes(student.id);
            return (
              <div key={student.id} onClick={() => handleVoteToggle(student.id)} 
                   className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${isSelected ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200' : 'bg-slate-800/40 border-slate-700 hover:border-slate-500'}`}>
                <div>
                  <p className="font-semibold text-sm">{student.full_name}</p>
                  <p className="text-xs text-slate-400">Grade {student.grade}</p>
                </div>
                {isSelected && <CheckCircle size={18} className="text-cyan-400"/>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Remark Submission for Top Student */}
      <div className="bg-slate-800/40 p-4 rounded-lg border border-slate-700 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2"><MessageSquare size={16} className="text-cyan-400"/> Principal Award Remark (Top Candidate)</h3>
        <select className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200" value={topStudentId || ''} onChange={e => setTopStudentId(e.target.value)}>
          <option value="">-- Choose primary student for certificate remark --</option>
          {students.filter(s => selectedVotes.includes(s.id)).map(s => (
            <option key={s.id} value={s.id}>{s.full_name}</option>
          ))}
        </select>
        <textarea className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-slate-200 h-20" placeholder="Detail why this student excelled academically to pass to administration..." value={monthlyRemark} onChange={e => setMonthlyRemark(e.target.value)}/>
        <button onClick={handleSaveRemark} className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold px-4 py-2 rounded text-sm flex items-center gap-2"><Send size={14}/> Submit Remark to Administration</button>
      </div>
    </div>
  );
}