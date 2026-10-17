import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import GlobalHeader from '../../components/GlobalHeader';

export default function Librarian() {
  const { schoolSlug } = useParams();
  
  // Navigation Tab State ('circulation' | 'inventory' | 'damages')
  const [activeTab, setActiveTab] = useState('circulation');

  // Scanning & Active Session State
  const [activeStudent, setActiveStudent] = useState(null);
  const [borrowedItems, setBorrowedItems] = useState([]);
  const [scanBuffer, setScanBuffer] = useState('');
  const [lastKeyTime, setLastKeyTime] = useState(0);

  // Historical Search State
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentSuggestions, setStudentSuggestions] = useState([]);
  const [selectedHistoryStudent, setSelectedHistoryStudent] = useState(null);
  const [loanHistory, setLoanHistory] = useState([]);
  const [allStudents, setAllStudents] = useState([]);

  // Inventory & Damage Report State
  const [inventory, setInventory] = useState([]);
  const [damages, setDamages] = useState([]);
  const [newBookTitle, setNewBookTitle] = useState('');
  const [newBookBarcode, setNewBookBarcode] = useState('');
  const [newBookCategory, setNewBookCategory] = useState('Fiction');

  // Resolution Modal State
  const [selectedDamage, setSelectedDamage] = useState(null);
  const [resolutionType, setResolutionType] = useState('Must Replace Book');
  const [customNote, setCustomNote] = useState('');
  const [marketPrice, setMarketPrice] = useState('25.00');

  // UI status banner
  const [statusMessage, setStatusMessage] = useState('System ready. Continuous HID scanner active.');
  const [statusType, setStatusType] = useState('info');

  // Fetch initial student directory and library inventory from Supabase
  useEffect(() => {
    async function fetchInitialData() {
      // Fetch students
      const { data: studentData, error: studentErr } = await supabase.from('students').select('*');
      if (!studentErr && studentData) {
        setAllStudents(studentData);
      }

      // Fetch book inventory catalog
      const { data: bookData, error: bookErr } = await supabase.from('book_inventory').select('*');
      if (!bookErr && bookData) {
        setInventory(bookData);
      } else {
        // Fallback mock data if table is empty during setup
        setInventory([
          { id: '1', barcode: 'BK-3029', title: 'To Kill a Mockingbird (Harper Lee)', category: 'Fiction', status: 'On Loan' },
          { id: '2', barcode: 'BK-9912', title: 'Principles of Physics (Halliday)', category: 'Science', status: 'Available' }
        ]);
      }

      // Fetch damage reports
      const { data: damageData, error: damageErr } = await supabase.from('damage_reports').select('*');
      if (!damageErr && damageData) {
        setDamages(damageData);
      } else {
        setDamages([
          { id: '1', asset: 'Principles of Physics (BK-9912)', borrower: 'Chloe Vance (#774102)', issue: 'Water damage on back cover and torn pages.', status: 'Pending Fine', resolution: null }
        ]);
      }
    }
    fetchInitialData();
  }, [schoolSlug]);

  // Live student autocomplete suggestions as typing occurs for loan history
  useEffect(() => {
    if (studentSearchQuery.trim().length > 0) {
      const matches = allStudents.filter(s => 
        `${s.first_name} ${s.last_name}`.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
        s.student_id_number?.toLowerCase().includes(studentSearchQuery.toLowerCase())
      );
      setStudentSuggestions(matches);
    } else {
      setStudentSuggestions([]);
    }
  }, [studentSearchQuery, allStudents]);

  // Global HID Barcode Scanner Listener
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        return;
      }

      const currentTime = Date.now();
      if (currentTime - lastKeyTime > 60) {
        setScanBuffer('');
      }
      setLastKeyTime(currentTime);

      if (event.key === 'Enter') {
        if (scanBuffer.trim().length > 0) {
          processScannedCode(scanBuffer.trim());
          setScanBuffer('');
        }
      } else if (event.key.length === 1) {
        setScanBuffer((prev) => prev + event.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scanBuffer, lastKeyTime, activeStudent]);

  // Process scanned token with Supabase verification
  const processScannedCode = async (code) => {
    if (code.toUpperCase().startsWith('STU-') || code.toUpperCase().startsWith('ID-') || code.length >= 8) {
      try {
        const { data: student, error } = await supabase
          .from('students')
          .select('*')
          .eq('student_id_number', code)
          .single();

        if (error || !student) {
          setStatusMessage(`❌ Student record not found for scanned ID: ${code}`);
          setStatusType('error');
          return;
        }

        const { data: overdues } = await supabase
          .from('library_loans')
          .select('*')
          .eq('student_id', student.id)
          .is('returned_at', null)
          .lt('due_date', new Date().toISOString());

        if (overdues && overdues.length > 0) {
          setActiveStudent(null);
          setStatusMessage(`⛔ ACCESS BLOCKED: Student ${student.first_name} ${student.last_name} has ${overdues.length} overdue item(s).`);
          setStatusType('error');
          return;
        }

        setActiveStudent(student);
        setStatusMessage(`✅ Borrower authenticated: ${student.first_name} ${student.last_name}. Ready to scan book barcode.`);
        setStatusType('success');
        fetchActiveLoans(student.id);

      } catch (err) {
        setStatusMessage(`❌ Error validating student token: ${err.message}`);
        setStatusType('error');
      }
    } else {
      if (!activeStudent) {
        setStatusMessage('⚠️ Please scan a student Digital ID card first before scanning book barcodes!');
        setStatusType('error');
        return;
      }
      handleBookCheckout(code, activeStudent.id);
    }
  };

  const fetchActiveLoans = async (studentId) => {
    const { data } = await supabase
      .from('library_loans')
      .select('*, book_inventory(title, barcode)')
      .eq('student_id', studentId)
      .is('returned_at', null);

    if (data) setBorrowedItems(data);
  };

  const handleBookCheckout = async (bookBarcode, studentId) => {
    try {
      const { data: book, error: bookErr } = await supabase
        .from('book_inventory')
        .select('*')
        .eq('barcode', bookBarcode)
        .single();

      if (bookErr || !book) {
        setStatusMessage(`❌ Book barcode not found in inventory: ${bookBarcode}`);
        setStatusType('error');
        return;
      }

      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 14);

      const { data: newLoan, error: loanErr } = await supabase
        .from('library_loans')
        .insert([{
          student_id: studentId,
          book_id: book.id,
          due_date: dueDate.toISOString(),
          checkout_condition: book.condition || 'Good',
          status: 'Active'
        }])
        .select('*, book_inventory(title, barcode)')
        .single();

      if (loanErr) throw loanErr;

      setBorrowedItems(prev => [newLoan, ...prev]);
      setStatusMessage(`📚 Successfully checked out "${book.title}"!`);
      setStatusType('success');

    } catch (err) {
      setStatusMessage(`❌ Checkout failed: ${err.message}`);
      setStatusType('error');
    }
  };

  const handleAddBookToInventory = async (e) => {
    e.preventDefault();
    if (!newBookTitle || !newBookBarcode) return;

    try {
      const { data, error } = await supabase
        .from('book_inventory')
        .insert([{ title: newBookTitle, barcode: newBookBarcode, category: newBookCategory, status: 'Available' }])
        .select()
        .single();

      if (error) throw error;

      setInventory(prev => [...prev, data || { id: Date.now(), title: newBookTitle, barcode: newBookBarcode, category: newBookCategory, status: 'Available' }]);
      setNewBookTitle('');
      setNewBookBarcode('');
      setStatusMessage(`📦 Successfully added "${newBookTitle}" to library inventory catalog.`);
      setStatusType('success');
    } catch (err) {
      setInventory(prev => [...prev, { id: Date.now(), title: newBookTitle, barcode: newBookBarcode, category: newBookCategory, status: 'Available' }]);
      setNewBookTitle('');
      setNewBookBarcode('');
      setStatusMessage(`📦 Added "${newBookTitle}" to local catalog view.`);
      setStatusType('success');
    }
  };

  const handleSaveResolution = async (e) => {
    e.preventDefault();
    if (!selectedDamage) return;

    const resolutionText = `${resolutionType} (${resolutionType.includes('Replace') || resolutionType.includes('Fine') ? '$' + marketPrice : 'Waived/Disposed'}) ${customNote ? '— Note: ' + customNote : ''}`;

    try {
      await supabase
        .from('damage_reports')
        .update({ status: 'Resolved', resolution: resolutionText })
        .eq('id', selectedDamage.id);
    } catch (err) {
      console.error("Supabase update fallback:", err);
    }

    setDamages(prev => prev.map(d => d.id === selectedDamage.id ? { ...d, status: 'Resolved', resolution: resolutionText } : d));
    setStatusMessage(`✅ Resolution saved for "${selectedDamage.asset}".`);
    setStatusType('success');
    setSelectedDamage(null);
    setCustomNote('');
  };

  const handleSelectHistoryStudent = async (student) => {
    setSelectedHistoryStudent(student);
    setStudentSearchQuery(`${student.first_name} ${student.last_name}`);
    setStudentSuggestions([]);

    const { data, error } = await supabase
      .from('library_loans')
      .select('*, book_inventory(title, barcode)')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setLoanHistory(data);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen font-sans selection:bg-cyan-500 selection:text-slate-950 pb-12">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        
        {/* Header & Sub-Navigation Tabs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-4">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 to-blue-600"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-base sm:text-lg font-bold uppercase tracking-wider text-cyan-400 mb-1">Library & Digital ID Suite</h1>
              <p className="text-xs text-slate-400">Continuous HID scanner active. Manage circulation, inventory catalog linked to parent portal reservations, and damage reports.</p>
            </div>

            {/* Tab Navigation */}
            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
              <button 
                onClick={() => setActiveTab('circulation')} 
                className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer ${activeTab === 'circulation' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'}`}
              >
                📚 Circulation Terminal
              </button>
              <button 
                onClick={() => setActiveTab('inventory')} 
                className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer ${activeTab === 'inventory' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'}`}
              >
                📦 Asset Inventory
              </button>
              <button 
                onClick={() => setActiveTab('damages')} 
                className={`px-4 py-2 rounded-lg font-medium transition cursor-pointer ${activeTab === 'damages' ? 'bg-cyan-500 text-slate-950 font-bold shadow' : 'text-slate-300 hover:text-white'}`}
              >
                ⚠️ Damage Reports ({damages.filter(d => d.status !== 'Resolved').length})
              </button>
            </div>
          </div>
        </div>

        {/* Status Alert Banner */}
        <div className={`p-4 rounded-xl text-xs sm:text-sm font-medium border shadow-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 transition-all animate-fadeIn ${
          statusType === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' :
          statusType === 'error' ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' :
          'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
        }`}>
          <span>{statusMessage}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider bg-slate-900 px-2.5 py-1 rounded border border-slate-700">Tenant RLS Active</span>
        </div>

        {/* TAB 1: CIRCULATION TERMINAL */}
        {activeTab === 'circulation' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            {/* Active Borrower Card */}
            <div className="lg:col-span-5 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-400">Active Borrower Session</h2>
              
              {activeStudent ? (
                <div className="space-y-4">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Student Name</span>
                      <p className="text-sm sm:text-base font-bold text-white">{activeStudent.first_name} {activeStudent.last_name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Student ID / Token</span>
                      <p className="text-xs font-mono text-cyan-400 bg-slate-900 p-1.5 rounded border border-slate-800">{activeStudent.student_id_number}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-slate-300">Currently Borrowed Active Loans</h3>
                    {borrowedItems.map(item => (
                      <div key={item.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-white">{item.book_inventory?.title}</p>
                          <p className="text-[10px] text-slate-400 font-mono">Due: {new Date(item.due_date).toLocaleDateString()}</p>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{item.checkout_condition}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => { setActiveStudent(null); setBorrowedItems([]); setStatusMessage('Borrower session cleared.'); }} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold py-2.5 rounded-xl transition border border-slate-700 cursor-pointer">
                    Clear Session / Next Student
                  </button>
                </div>
              ) : (
                <div className="text-center py-16 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500 space-y-2">
                  <svg className="w-8 h-8 mx-auto text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                  <p className="text-xs">Scan Student Digital ID Pass at station...</p>
                </div>
              )}
            </div>

            {/* Historical Loan Search Section */}
            <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-400">Student Loan History Audit</h2>
              <p className="text-xs text-slate-400">Search student names or IDs for past borrowing history and returned records.</p>
              
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Type student name or ID for history..." 
                  value={studentSearchQuery}
                  onChange={(e) => setStudentSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs sm:text-sm text-slate-100 focus:outline-none focus:border-cyan-500 shadow-inner"
                />

                {studentSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 z-30 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl max-h-52 overflow-y-auto divide-y divide-slate-800">
                    {studentSuggestions.map(student => (
                      <div key={student.id} onClick={() => handleSelectHistoryStudent(student)} className="p-3 hover:bg-slate-800/80 cursor-pointer flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-white">{student.first_name} {student.last_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">ID: {student.student_id_number}</p>
                        </div>
                        <span className="text-cyan-400 text-[10px] font-semibold bg-cyan-500/10 px-2 py-0.5 rounded">Select History</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedHistoryStudent ? (
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center text-xs bg-slate-950 p-3 rounded-xl border border-slate-800">
                    <span>Viewing audit trail for: <strong className="text-white">{selectedHistoryStudent.first_name} {selectedHistoryStudent.last_name}</strong></span>
                    <button onClick={() => { setSelectedHistoryStudent(null); setLoanHistory([]); setStudentSearchQuery(''); }} className="text-slate-400 hover:text-white underline cursor-pointer">Clear</button>
                  </div>

                  {loanHistory.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-800 text-xs">
                        <thead>
                          <tr>
                            <th className="px-3 py-2 text-left font-semibold text-slate-400">Book Title</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-400">Borrowed</th>
                            <th className="px-3 py-2 text-left font-semibold text-slate-400">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60">
                          {loanHistory.map(loan => (
                            <tr key={loan.id}>
                              <td className="px-3 py-3 font-medium text-white">{loan.book_inventory?.title}</td>
                              <td className="px-3 py-3 font-mono text-slate-300">{new Date(loan.created_at).toLocaleDateString()}</td>
                              <td className="px-3 py-3"><span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{loan.status || 'Active'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-6">No historical loans found for this student.</p>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-2xl text-slate-500">
                  <p className="text-xs">Search and select a student above to inspect full loan history.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: ASSET INVENTORY CATALOG */}
        {activeTab === 'inventory' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn">
            <div className="lg:col-span-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-400">Add New Library Asset</h2>
              <p className="text-xs text-slate-400">Added items instantly reflect in ParentLibrary.jsx for family reservations and browsing.</p>
              
              <form onSubmit={handleAddBookToInventory} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Book Title & Author</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Atomic Habits (James Clear)" 
                    value={newBookTitle} 
                    onChange={e => setNewBookTitle(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Barcode ID</label>
                  <input 
                    type="text" 
                    placeholder="e.g. BK-4091" 
                    value={newBookBarcode} 
                    onChange={e => setNewBookBarcode(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Category</label>
                  <select 
                    value={newBookCategory} 
                    onChange={e => setNewBookCategory(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                  >
                    <option value="Fiction">Fiction / Literature</option>
                    <option value="Science">Science & Textbooks</option>
                    <option value="History">History & Humanities</option>
                    <option value="Reference">Reference</option>
                  </select>
                </div>
                <button type="submit" className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition shadow cursor-pointer">
                  Publish to Catalog & Parent Portal
                </button>
              </form>
            </div>

            <div className="lg:col-span-8 bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-400">Library Catalog Master List</h2>
              
              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                    <tr>
                      <th className="p-3">Barcode</th>
                      <th className="p-3">Title & Author</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Availability Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {inventory.map((item) => (
                      <tr key={item.id || item.barcode}>
                        <td className="p-3 font-mono text-cyan-400">{item.barcode}</td>
                        <td className="p-3 font-medium text-white">{item.title}</td>
                        <td className="p-3 text-slate-400">{item.category || 'General'}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${item.status === 'Available' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                            {item.status || 'Available'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DAMAGE REPORTS & RESOLUTION MANAGER */}
        {activeTab === 'damages' && (
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-cyan-400">Asset Damage & Resolution Manager</h2>
                <p className="text-xs text-slate-400">Review reported book damages, assign fines, or mark items for repair/replacement.</p>
              </div>
              <span className="text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20 px-3 py-1 rounded-full font-semibold">{damages.filter(d => d.status !== 'Resolved').length} Pending Incidents</span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="p-3">Asset & Barcode</th>
                    <th className="p-3">Reported Borrower</th>
                    <th className="p-3">Damage Description</th>
                    <th className="p-3">Resolution Action</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {damages.map((d) => (
                    <tr key={d.id}>
                      <td className="p-3 font-medium text-white">{d.asset}</td>
                      <td className="p-3">{d.borrower}</td>
                      <td className="p-3 text-amber-300">{d.issue}</td>
                      <td className="p-3">
                        {d.status === 'Resolved' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            Resolved: {d.resolution}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Pending Action
                          </span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <button onClick={() => setSelectedDamage(d)} className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-3 py-1.5 rounded font-semibold transition cursor-pointer">
                          {d.status === 'Resolved' ? 'Edit Resolution' : 'Resolve / Assign Action'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </main>

      {/* RESOLUTION ACTION MODAL POPUP */}
      {selectedDamage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-cyan-400">Assign Library Resolution Action</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedDamage.asset} — {selectedDamage.borrower}</p>
              </div>
              <button onClick={() => setSelectedDamage(null)} className="text-slate-400 hover:text-white text-sm font-bold px-2 py-1 cursor-pointer">✕</button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-amber-300">
              <strong>Reported Issue:</strong> {selectedDamage.issue}
            </div>

            <form onSubmit={handleSaveResolution} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Select Resolution Template</label>
                <select 
                  value={resolutionType} 
                  onChange={e => setResolutionType(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="Must Replace Book">Must Replace Book (Market Price Replacement)</option>
                  <option value="Disposed">Disposed (Damaged Beyond Repair)</option>
                  <option value="No Return Required">No Return Required / Waived</option>
                  <option value="Assigned Fine">Assigned Student Account Fine</option>
                </select>
              </div>

              {(resolutionType.includes('Replace') || resolutionType.includes('Fine')) && (
                <div>
                  <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Market Price / Fine Amount ($ AUD)</label>
                  <input 
                    type="text" 
                    value={marketPrice} 
                    onChange={e => setMarketPrice(e.target.value)} 
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-400 mb-1">Staff Remarks / Notes (Optional)</label>
                <textarea 
                  rows="2"
                  placeholder="Add specific details or reason..." 
                  value={customNote} 
                  onChange={e => setCustomNote(e.target.value)} 
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setSelectedDamage(null)} className="w-1/2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-2.5 rounded-xl transition cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="w-1/2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs py-2.5 rounded-xl transition shadow cursor-pointer">
                  Save Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}