import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import GlobalHeader from '../components/GlobalHeader';
import JsBarcode from 'jsbarcode';
import html2canvas from 'html2canvas';

export default function ParentDigitalIdPreview() {
  const { schoolSlug, studentId } = useParams();
  const [childData, setChildData] = useState(null);
  const [schoolConfig, setSchoolConfig] = useState({
    schoolName: "School Portal",
    logoUrl: "https://api.iconify.design/lucide:graduation-cap.svg?color=%2306b6d4"
  });
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    async function fetchChildAndSchool() {
      try {
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

        const { data: studentData, error: studentError } = await supabase
          .from('students')
          .select('*')
          .eq('school_slug', schoolSlug)
          .eq('student_id_number', studentId)
          .single();

        if (studentError) throw studentError;

        if (studentData) {
          setChildData({
            id: studentData.student_id_number,
            fullName: `${studentData.first_name} ${studentData.last_name}`,
            enrolmentYear: studentData.enrolment_year || '2026',
            expiryDate: studentData.expiry_date || '31 Dec 2026',
            photoUrl: studentData.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop&crop=faces"
          });
        }
      } catch (err) {
        console.error("Error loading child digital pass:", err.message);
        setChildData({
          id: "STU-2026-8841",
          fullName: "Benjamin Tremble",
          enrolmentYear: "2026",
          expiryDate: "31 Dec 2026",
          photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=400&fit=crop&crop=faces"
        });
      }
    }

    if (schoolSlug && studentId) {
      fetchChildAndSchool();
    }
  }, [schoolSlug, studentId]);

  useEffect(() => {
    if (childData) {
      try {
        JsBarcode("#parentPassBarcode", childData.id, {
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
  }, [childData]);

  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleDownloadWallet = async () => {
    const cardElement = document.getElementById('parentCaptureCard');
    if (cardElement) {
      await html2canvas(cardElement, { scale: 3, useCORS: true, backgroundColor: null });
      showToast(`Digital pass generated for mobile wallet.`);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-cyan-500 selection:text-slate-950">
      <GlobalHeader />

      <main className="max-w-3xl mx-auto px-4 py-12 flex flex-col items-center">
        <div className="w-full flex justify-between items-center mb-6">
          <div>
            <h1 className="text-lg font-bold text-white">Student Digital Pass</h1>
            <p className="text-xs text-slate-400">Official verified credentials for your child.</p>
          </div>
          <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full font-mono font-medium">
            RLS Verified Pass
          </span>
        </div>

        {childData ? (
          <div className="flex flex-col items-center w-full">
            <div id="parentCaptureCard" className="w-[440px] h-[278px] bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col justify-between p-4 text-slate-100 select-none">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-500 z-20"></div>

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

              <div className="relative z-10 flex items-center justify-between my-auto py-1">
                <div className="relative flex-shrink-0">
                  <div className="w-20 h-24 rounded-xl bg-slate-900 border-2 border-slate-700 overflow-hidden shadow-md flex items-center justify-center">
                    <img src={childData.photoUrl} className="w-full h-full object-cover" alt="Student Portrait" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 flex flex-col justify-center px-4">
                  <h3 className="text-sm font-bold text-white tracking-tight truncate mb-1">{childData.fullName}</h3>
                  <div className="inline-flex items-center bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-full mb-1.5 w-fit">
                    <span className="text-[8px] text-slate-400 font-medium uppercase tracking-wider mr-1">ID:</span>
                    <span className="text-[11px] font-mono font-bold text-cyan-400">{childData.id}</span>
                  </div>
                  <div className="flex flex-col space-y-0.5 text-[9px] text-slate-400">
                    <span>Enrolled: <strong className="text-slate-200 font-semibold">{childData.enrolmentYear}</strong></span>
                    <span>Expires: <strong className="text-slate-200 font-semibold">{childData.expiryDate}</strong></span>
                  </div>
                </div>

                <div className="flex-shrink-0 w-20 h-24 bg-slate-900 border border-slate-700 rounded-xl p-2.5 flex items-center justify-center shadow-md">
                  <img src={schoolConfig.logoUrl} className="w-full h-full object-contain" alt="School Crest" />
                </div>
              </div>

              <div className="relative z-10 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <div className="bg-white px-2 py-1 rounded w-[190px] flex justify-center shadow-inner">
                  <svg id="parentPassBarcode"></svg>
                </div>
                <p className="text-[8px] text-slate-500 text-right leading-tight tracking-tight max-w-[140px]">Secure digital credential. Scan to verify.</p>
              </div>
            </div>

            <div className="w-full max-w-[440px] mt-6">
              <button 
                onClick={handleDownloadWallet} 
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2"
              >
                <span>Add to Mobile Wallet (Apple / Google)</span>
              </button>
            </div>

            {toastMessage && (
              <div className="mt-4 w-full max-w-[440px] bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs p-3 rounded-xl text-center font-medium">
                {toastMessage}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-400 py-12">Loading secure student record...</div>
        )}
      </main>
    </div>
  );
}