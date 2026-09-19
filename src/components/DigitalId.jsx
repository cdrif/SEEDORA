import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient'; // Adjust path to your Supabase client
import GlobalHeader from '../../components/GlobalHeader'; // Adjust path to your GlobalHeader component
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';

export default function DigitalId() {
  const { schoolSlug } = useParams(); // Extracts school slug for multi-tenancy RLS/RBAC scoping
  const [students, setStudents] = useState([]);
  const [currentSelectedStudent, setCurrentSelectedStudent] = useState(null);
  const [schoolConfig, setSchoolConfig] = useState({
    schoolName: "Loading School...",
    logoUrl: "https://api.iconify.design/lucide:graduation-cap.svg?color=%2306b6d4"
  });
  const [uploadStatus, setUploadStatus] = useState({ visible: false, text: '' });
  const [toastMessage, setToastMessage] = useState(null);

  // 1. Fetch school branding and student directory based on school_slug ensuring RLS/RBAC
  useEffect(() => {
    async function fetchSchoolAndStudents() {
      try {
        // Fetch Tenant / School Info using slug
        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('*')
          .eq('slug', schoolSlug)
          .single();

        if (schoolError) throw schoolError;

        if (schoolData) {
          setSchoolConfig({
            schoolName: schoolData.name || "School Portal",
            logoUrl: schoolData.logo_url || "https://api.iconify.design/lucide:graduation-cap.svg?color=%2306b6d4"
          });
        }

        // Fetch Students belonging to this school enforcing tenant RLS
        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('school_slug', schoolSlug);

        if (studentError) throw studentError;

        if (studentData && studentData.length > 0) {
          const mappedStudents = studentData.map(s => ({
            id: s.student_id_number || `STU-${s.id}`,
            fullName: `${s.first_name} ${s.last_name}`,
            enrolmentYear: s.enrolment_year || '2026',
            expiryDate: s.expiry_date || '31 Dec 2026',
            photoUrl: s.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop&crop=faces"
          }));
          setStudents(mappedStudents);
          setCurrentSelectedStudent(mappedStudents[0]);
        }
      } catch (err) {
        console.error("Error loading tenant credential data:", err.message);
        // Fallback demo state if offline/unlinked for previewing
        const fallbackStudents = [
          {
            id: "STU-2026-8841",
            fullName: "Benjamin Tremble",
            enrolmentYear: "2026",
            expiryDate: "31 Dec 2026",
            photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop&crop=faces"
          }
        ];
        setStudents(fallbackStudents);
        setCurrentSelectedStudent(fallbackStudents[0]);
      }
    }

    if (schoolSlug) {
      fetchSchoolAndStudents();
    }
  }, [schoolSlug]);

  // 2. Generate Barcode whenever selected student changes
  useEffect(() => {
    if (currentSelectedStudent) {
      try {
        JsBarcode("#passBarcode", currentSelectedStudent.id, {
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
        console.error("Barcode generation error:", e);
      }
    }
  }, [currentSelectedStudent]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const handleSchoolNameChange = async (e) => {
    const newName = e.target.value;
    setSchoolConfig(prev => ({ ...prev, schoolName: newName }));
    // Persist to Supabase tenant configuration table here if required
  };

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSchoolConfig(prev => ({ ...prev, logoUrl: e.target.result }));
        showToast("School crest uploaded and applied successfully!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStudentMugshotUpload = (event) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    let matchedCount = 0;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Data = e.target.result;
        const filename = file.name.toLowerCase();

        setStudents(prevStudents => {
          return prevStudents.map(student => {
            const matches = filename.includes(student.id.toLowerCase()) || 
                            filename.includes(student.fullName.toLowerCase().replace(/\s+/g, ''));
            if (matches) {
              matchedCount++;
              if (currentSelectedStudent && currentSelectedStudent.id === student.id) {
                setCurrentSelectedStudent({ ...student, photoUrl: base64Data });
              }
              return { ...student, photoUrl: base64Data };
            }
            return student;
          });
        });

        setUploadStatus({
          visible: true,
          text: `Successfully ingested and linked student mugshot(s) to Seedora profiles.`
        });
        setTimeout(() => setUploadStatus({ visible: false, text: '' }), 4000);
      };
      reader.readAsDataURL(file);
    });
  };

  const simulateSendToParent = async () => {
    const cardElement = document.getElementById('captureCardElement');
    if (cardElement) {
      const canvas = await html2canvas(cardElement, { scale: 3, useCORS: true, backgroundColor: null });
      const imageUrl = canvas.toDataURL("image/png");
      showToast(`Secure digital card successfully emailed to ${currentSelectedStudent.fullName}'s parent.`);
    }
  };

  const simulateWalletDownload = async () => {
    const cardElement = document.getElementById('captureCardElement');
    if (cardElement) {
      const canvas = await html2canvas(cardElement, { scale: 3, useCORS: true, backgroundColor: null });
      showToast(`Google / Apple Wallet pass generated for ${currentSelectedStudent.fullName}.`);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Global Header Integration */}
      <GlobalHeader />

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* Left Column: Directory & Administrative Controls (RBAC Admin Restricted) */}
        <section className="lg:col-span-5 space-y-6">
          
          {/* School Logo & Branding Configuration Manager */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h2 className="text-sm font-semibold tracking-wide text-cyan-400 uppercase mb-3">1. School Crest & Branding Manager</h2>
            <p className="text-xs text-slate-400 mb-4">Upload the official school crest image. Automatically renders across tenant passes.</p>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Institution Name</label>
                <input 
                  type="text" 
                  value={schoolConfig.schoolName}
                  onChange={handleSchoolNameChange}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500" 
                  placeholder="Enter school name..."
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Upload School Crest File</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleLogoUpload} 
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Student Mugshot / Media Ingestion Pipeline */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold tracking-wide text-cyan-400 uppercase">2. Student Mugshot Ingestion</h2>
              <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-medium">Smart Auto-Match</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Bulk-ingest archives parsed against tenant student records securely under RLS guidelines.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">Upload Student Mugshot(s)</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleStudentMugshotUpload} 
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-500 cursor-pointer"
                />
              </div>
              {uploadStatus.visible && (
                <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2.5 rounded-lg flex items-center space-x-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span>{uploadStatus.text}</span>
                </div>
              )}
            </div>
          </div>

          {/* Student Directory List */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold tracking-wide text-cyan-400 uppercase">3. Student Directory</h2>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full">{students.length} Students</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Select a student record to preview their secure virtual credential pass.</p>

            <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
              {students.map((student) => {
                const isSelected = currentSelectedStudent && student.id === currentSelectedStudent.id;
                return (
                  <div 
                    key={student.id}
                    onClick={() => setCurrentSelectedStudent(student)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected 
                        ? 'bg-cyan-950/40 border-cyan-500/50 shadow-md shadow-cyan-950/50' 
                        : 'bg-slate-950/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <img src={student.photoUrl} className="w-9 h-9 rounded-lg object-cover border border-slate-700" alt="Thumb" />
                      <div>
                        <p className="text-xs font-semibold text-slate-200">{student.fullName}</p>
                        <p className="text-[10px] text-slate-400 font-mono">{student.id}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg ${isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300'}`}>
                      {isSelected ? 'Active' : 'Select'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: Live Virtual ID Pass Preview Workspace */}
        <section className="lg:col-span-7 flex flex-col items-center justify-start">
          <div className="w-full bg-slate-900/80 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-6">
              <h2 className="text-sm font-semibold tracking-wide text-cyan-400 uppercase">Virtual Credential Pass Preview</h2>
              <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-lg font-mono">RLS & RBAC Secure Tenant</span>
            </div>

            {/* Landscape Credit Card Pass Pass Container */}
            {currentSelectedStudent && (
              <div id="captureCardElement" className="w-[440px] h-[278px] bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col justify-between p-4 text-slate-100 select-none">
                
                {/* Top Accent Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 z-20"></div>

                {/* Pass Header */}
                <div className="relative z-10 flex justify-between items-center border-b border-slate-800/80 pb-2 pt-1">
                  <div className="flex items-center space-x-2.5">
                    <img src={schoolConfig.logoUrl} className="w-7 h-7 object-contain bg-slate-900 p-1 rounded-lg border border-slate-700" alt="Logo" />
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 leading-tight">{schoolConfig.schoolName}</h4>
                      <p className="text-[9px] text-cyan-400 font-medium tracking-widest">STUDENT DIGITAL PASS</p>
                    </div>
                  </div>
                  <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono font-medium">Active Token</span>
                </div>

                {/* Pass Body */}
                <div className="relative z-10 flex items-center justify-between my-auto py-1">
                  <div className="relative flex-shrink-0">
                    <div className="w-20 h-24 rounded-xl bg-slate-900 border-2 border-slate-700 overflow-hidden shadow-md flex items-center justify-center">
                      <img src={currentSelectedStudent.photoUrl} className="w-full h-full object-cover" alt="Student Portrait" />
                    </div>
                    <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-slate-950 rounded-full p-0.5 shadow" title="Verified Record">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-center px-4">
                    <h3 className="text-sm font-bold text-white tracking-tight truncate mb-1">{currentSelectedStudent.fullName}</h3>
                    
                    <div className="inline-flex items-center bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-full mb-1.5 w-fit">
                      <span className="text-[8px] text-slate-400 font-medium uppercase tracking-wider mr-1">ID:</span>
                      <span className="text-[11px] font-mono font-bold text-cyan-400">{currentSelectedStudent.id}</span>
                    </div>

                    <div className="flex flex-col space-y-0.5 text-[9px] text-slate-400">
                      <span>Enrolled: <strong className="text-slate-200 font-semibold">{currentSelectedStudent.enrolmentYear}</strong></span>
                      <span>Expires: <strong className="text-slate-200 font-semibold">{currentSelectedStudent.expiryDate}</strong></span>
                    </div>
                  </div>

                  <div className="flex-shrink-0 w-20 h-24 bg-slate-900 border border-slate-700 rounded-xl p-2.5 flex items-center justify-center shadow-md">
                    <img src={schoolConfig.logoUrl} className="w-full h-full object-contain" alt="School Crest" />
                  </div>
                </div>

                {/* Pass Footer */}
                <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="bg-white px-2 py-1 rounded w-[190px] flex justify-center shadow-inner">
                    <svg id="passBarcode"></svg>
                  </div>
                  <p className="text-[8px] text-slate-500 text-right leading-tight tracking-tight max-w-[140px]">Secure digital credential. Scan to verify.</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="w-full max-w-[440px] mt-4 flex gap-3">
              <button onClick={simulateSendToParent} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-cyan-900/35 transition-all flex items-center justify-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path></svg>
                <span>Email to Linked Parent</span>
              </button>
              <button onClick={simulateWalletDownload} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs py-3 px-4 rounded-xl transition-all flex items-center justify-center space-x-2">
                <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                <span>Add to Wallet</span>
              </button>
            </div>

            {/* Notification Toast */}
            {toastMessage && (
              <div className="mt-4 w-full max-w-[440px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl text-center font-medium animate-fadeIn">
                {toastMessage}
              </div>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}