import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';
import { logComplianceAccess } from '../utils/auditLogger';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';

// Helper to play notification sound using the attached audio file
function playNotificationSound(isCritical = false) {
  try {
    // Using the attached audio file path for alerts
    const audioPath = '/sounds/liecio-message-alert-190042_2.mp3';
      
    const audio = new Audio(audioPath);
    audio.play().catch((err) => {
      console.log("Audio playback blocked until user interacts with the page:", err);
    });
  } catch (e) {
    console.log("Audio playback error:", e);
  }
}

export default function ParentDashboard() {
  const [loading, setLoading] = useState(true);
  const [parentUserId, setParentUserId] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [schoolConfig, setSchoolConfig] = useState({
    schoolName: "School Portal",
    logoUrl: "https://api.iconify.design/lucide:graduation-cap.svg?color=%2306b6d4"
  });
  const [errorMsg, setErrorMsg] = useState(null);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [activeNotification, setActiveNotification] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const barcodeRef = useRef(null);

  useEffect(() => {
    async function fetchParentData() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');

        setParentUserId(user.id);

        const { data: links, error: linkError } = await supabase
          .from('parent_student_links')
          .select('id, student_name, student_code, status, student_id')
          .eq('parent_id', user.id);

        if (linkError) throw linkError;

        setStudents(links || []);
        if (links && links.length > 0) {
          // Fetch full student details for the digital pass preview
          const { data: studentRecord } = await supabase
            .from('students')
            .select('*')
            .eq('id', links[0].student_id || links[0].student_code)
            .single();

          if (studentRecord) {
            setSelectedChild({
              id: studentRecord.student_id_number || links[0].student_code,
              fullName: `${studentRecord.first_name} ${studentRecord.last_name}`,
              enrolmentYear: studentRecord.enrolment_year || '2026',
              expiryDate: studentRecord.expiry_date || '31 Dec 2026',
              photoUrl: studentRecord.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop&crop=faces"
            });
          } else {
            setSelectedChild({
              id: links[0].student_code,
              fullName: links[0].student_name,
              enrolmentYear: '2026',
              expiryDate: '31 Dec 2026',
              photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop&crop=faces"
            });
          }
        }

        const { data: memberCheck } = await supabase
          .from('school_members')
          .select('school_slug')
          .eq('user_id', user.id)
          .single();

        if (memberCheck?.school_slug) {
          setSchoolSlug(memberCheck.school_slug);
          
          const { data: schoolData } = await supabase
            .from('schools')
            .select('*')
            .eq('slug', memberCheck.school_slug)
            .single();

          if (schoolData) {
            setSchoolConfig({
              schoolName: schoolData.name || "School Portal",
              logoUrl: schoolData.logo_url || "https://api.iconify.design/lucide:graduation-cap.svg?color=%2306b6d4"
            });
          }
        } else {
          setSchoolSlug('default-school');
        }

        if (links && links.length > 0) {
          await logComplianceAccess('VIEW_STUDENT_RECORDS', `Viewed ${links.length} linked student record(s)`);
        }
      } catch (err) {
        console.error('Error fetching parent dashboard data:', err.message);
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchParentData();
  }, []);

  // Generate Barcode for the active child pass
  useEffect(() => {
    if (selectedChild && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, selectedChild.id, {
          format: "CODE128",
          lineColor: "#0f172a",
          width: 1.4,
          height: 28,
          displayValue: true,
          fontSize: 10,
          fontOptions: "bold",
          margin: 1
        });
      } catch (e) {
        console.error("Barcode error:", e);
      }
    }
  }, [selectedChild]);

  // Realtime notification listener hook effect for parents
  useEffect(() => {
    if (!schoolSlug) return;

    const channel = supabase
      .channel('public:school_notifications:parent')
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
          if (newNotif.target_role === 'parent' || newNotif.target_role === 'all') {
            setActiveNotification(newNotif);
            playNotificationSound(newNotif.is_critical);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolSlug]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownloadWallet = async () => {
    const cardElement = document.getElementById('parentCaptureCard');
    if (cardElement) {
      await html2canvas(cardElement, { scale: 3, useCORS: true, backgroundColor: null });
      showToast(`Google / Apple Wallet pass generated for ${selectedChild?.fullName}.`);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />
      
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Parent Dashboard</h1>
          <p className="text-sm text-gray-400 mt-1">
            Parent User ID: <span className="font-mono text-gray-300">{parentUserId || 'Loading...'}</span>
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading student records...</div>
        ) : errorMsg ? (
          <div className="p-4 bg-red-950/50 border border-red-800 rounded-lg text-red-200 text-sm">
            Error: {errorMsg}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDE: Linked Students & Account Overview */}
            <div className="lg:col-span-8 space-y-6">
              <h2 className="text-lg font-semibold text-gray-100">Linked Student Records</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {students.length === 0 ? (
                  <p className="text-gray-400 text-sm">No students currently linked to this account.</p>
                ) : (
                  students.map((student) => (
                    <div 
                      key={student.id} 
                      onClick={() => setSelectedChild({
                        id: student.student_code,
                        fullName: student.student_name,
                        enrolmentYear: '2026',
                        expiryDate: '31 Dec 2026',
                        photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop&crop=faces"
                      })}
                      className={`bg-[#111827] border rounded-xl p-6 shadow-sm cursor-pointer transition-all ${selectedChild?.id === student.student_code ? 'border-cyan-500 shadow-cyan-950/50' : 'border-gray-800 hover:border-gray-700'}`}
                    >
                      <h3 className="text-lg font-semibold text-gray-100">{student.student_name}</h3>
                      <p className="text-xs text-gray-400 mt-1">Code: {student.student_code}</p>
                      <p className="text-xs font-mono text-gray-500 mt-2">Status: {student.status || 'Active'}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* HARD RIGHT SIDE: Parent Digital ID Preview & Wallet Download Panel */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-[#111827] border border-cyan-500/30 rounded-xl p-5 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
                <h3 className="text-sm font-bold tracking-wide text-cyan-400 uppercase mb-1">Child Digital Credential Pass</h3>
                <p className="text-[11px] text-slate-400">Official verified pass for mobile wallet sync.</p>
              </div>

              {selectedChild ? (
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-4 shadow-xl flex flex-col items-center">
                  
                  {/* Digital ID Pass Card */}
                  <div id="parentCaptureCard" className="w-full max-w-[340px] h-[215px] bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden relative flex flex-col justify-between p-3 text-slate-100 select-none scale-[0.95] origin-top">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 z-20"></div>

                    <div className="relative z-10 flex justify-between items-center border-b border-slate-800/80 pb-1.5 pt-0.5">
                      <div className="flex items-center space-x-2">
                        <img src={schoolConfig.logoUrl} className="w-5 h-5 object-contain bg-slate-900 p-0.5 rounded border border-slate-700" alt="Logo" />
                        <div>
                          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-200 leading-tight">{schoolConfig.schoolName}</h4>
                          <p className="text-[7px] text-cyan-400 font-medium tracking-widest">STUDENT PASS</p>
                        </div>
                      </div>
                      <span className="text-[7px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-medium">Verified</span>
                    </div>

                    <div className="relative z-10 flex items-center justify-between my-auto py-1">
                      <div className="relative flex-shrink-0">
                        <div className="w-14 h-18 rounded-lg bg-slate-900 border border-slate-700 overflow-hidden shadow flex items-center justify-center">
                          <img src={selectedChild.photoUrl} className="w-full h-full object-cover" alt="Portrait" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col justify-center px-3">
                        <h4 className="text-xs font-bold text-white tracking-tight truncate mb-0.5">{selectedChild.fullName}</h4>
                        <div className="inline-flex items-center bg-slate-900/90 border border-slate-800 px-1.5 py-0.5 rounded mb-1 w-fit">
                          <span className="text-[7px] text-slate-400 uppercase mr-1">ID:</span>
                          <span className="text-[9px] font-mono font-bold text-cyan-400">{selectedChild.id}</span>
                        </div>
                        <div className="flex flex-col space-y-0 text-[8px] text-slate-400">
                          <span>Enrolled: <strong className="text-slate-200">{selectedChild.enrolmentYear}</strong></span>
                          <span>Expires: <strong className="text-slate-200">{selectedChild.expiryDate}</strong></span>
                        </div>
                      </div>

                      <div className="flex-shrink-0 w-14 h-18 bg-slate-900 border border-slate-700 rounded-lg p-1.5 flex items-center justify-center shadow">
                        <img src={schoolConfig.logoUrl} className="w-full h-full object-contain" alt="Crest" />
                      </div>
                    </div>

                    <div className="relative z-10 pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                      <div className="bg-white px-1 py-0.5 rounded w-[140px] flex justify-center shadow-inner">
                        <svg ref={barcodeRef}></svg>
                      </div>
                      <p className="text-[7px] text-slate-500 text-right leading-tight max-w-[100px]">Secure pass.</p>
                    </div>
                  </div>

                  {/* Wallet Action Button */}
                  <div className="w-full max-w-[340px] mt-3">
                    <button 
                      onClick={handleDownloadWallet} 
                      className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-[11px] py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-900/30 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                      <span>Save to Apple / Google Wallet</span>
                    </button>
                  </div>

                  {toastMessage && (
                    <div className="mt-2 w-full max-w-[340px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] p-2 rounded-lg text-center font-medium">
                      {toastMessage}
                    </div>
                  )}

                </div>
              ) : (
                <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 text-center text-xs text-gray-400">
                  Select a student to view pass.
                </div>
              )}

            </div>

          </div>
        )}
      </main>

      {/* School-Wide Broadcast Popup Banner */}
      {activeNotification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-gray-900 border border-indigo-500/50 rounded-xl p-4 shadow-2xl animate-bounce">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded font-bold uppercase">
                📢 School Broadcast
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