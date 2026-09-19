import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // Or your router package of choice

export default function BugReportWidget() {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [timestamp, setTimestamp] = useState('');
  const [submitted, setSubmitted] = useState(false);

  // Define paths where the bug reporter should NOT appear
  const currentPath = location.pathname.toLowerCase();
  const isExcluded = currentPath.includes('login') || currentPath.includes('splash') || currentPath === '/';

  useEffect(() => {
    if (isOpen) {
      setTimestamp(new Date().toLocaleString());
    }
  }, [isOpen]);

  if (isExcluded) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      recipient: "bugs@seedora.com",
      page: document.title || currentPath,
      description,
      timestamp
    };

    console.log("Dispatching Bug Report to bugs@seedora.com:", payload);

    setSubmitted(true);
    setTimeout(() => {
      setIsOpen(false);
      setSubmitted(false);
      setDescription('');
    }, 2500);
  };

  return (
    <div id="seedoraBugReportWrapper">
      {/* Floating Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)} 
        className="fixed bottom-6 right-6 z-50 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl shadow-emerald-500/25 transition-all flex items-center space-x-2 cursor-pointer border border-emerald-400/30"
      >
        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
        </svg>
        <span>Bug Report</span>
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-[#1f293d] rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Submit a Bug Report</h3>
                <p className="text-[11px] text-gray-400">Send an issue directly to bugs@seedora.com</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition-colors cursor-pointer">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Page Name</label>
                  <input 
                    type="text" 
                    value={document.title || currentPath} 
                    readOnly 
                    className="w-full bg-[#060810] border border-[#1f293d] rounded-xl px-3.5 py-2.5 text-xs text-gray-300 outline-none cursor-not-allowed" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description of the Bug</label>
                  <textarea 
                    rows="4" 
                    required 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Please describe what happened..." 
                    className="w-full bg-[#060810] border border-[#1f293d] rounded-xl p-3 text-xs text-gray-200 focus:border-emerald-500 outline-none resize-none"
                  ></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Timestamp</label>
                  <input 
                    type="text" 
                    value={timestamp} 
                    readOnly 
                    className="w-full bg-[#060810] border border-[#1f293d] rounded-xl px-3.5 py-2.5 text-xs text-gray-300 outline-none cursor-not-allowed" 
                  />
                </div>

                <div className="pt-2 flex justify-end space-x-2">
                  <button 
                    type="button" 
                    onClick={() => setIsOpen(false)} 
                    className="bg-[#060810] hover:bg-gray-900 border border-[#1f293d] text-gray-300 text-xs font-semibold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
                  >
                    Submit Report
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-8 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <p className="text-xs font-semibold text-white px-4">Report has been sent. Thank you for helping Seedora</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}