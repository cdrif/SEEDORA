import React, { useState } from 'react';

export default function ExecutiveFinance() {
    // State Management
    const [isUnlocked, setIsUnlocked] = useState(false);
    const [pin, setPin] = useState('');
    const [activeTab, setActiveTab] = useState('students');
    
    // Calculator State
    const [calc, setCalc] = useState({
        teacher: 'Dr. Alan Grant',
        hourly: 45.00,
        overtime: 67.50,
        taxPct: 30.0,
        superPct: 11.5,
        regHrs: 76,
        otHrs: 4,
        sickHrs: 0
    });

    // Payout Queue State
    const [payouts, setPayouts] = useState([
        { id: 1, name: 'Dr. Alan Grant', dept: 'Science Dept', bsb: '064-123', acc: '88234190', net: '$2,583.00', status: 'Due' },
        { id: 2, name: 'Ms. Ellie Sattler', dept: 'Biology Dept', bsb: '082-441', acc: '55610293', net: '$2,016.00', status: 'Paid' }
    ]);

    // PDF Modal State
    const [modalData, setModalData] = useState(null);

    // Calculations
    const gross = (calc.regHrs * calc.hourly) + (calc.otHrs * calc.overtime);
    const tax = gross * (calc.taxPct / 100);
    const superVal = gross * (calc.superPct / 100);
    const net = gross - tax;

    const handleUnlock = (e) => {
        e.preventDefault();
        setIsUnlocked(true);
    };

    const toggleStatus = (id) => {
        setPayouts(payouts.map(p => p.id === id ? { ...p, status: p.status === 'Due' ? 'Paid' : 'Due' } : p));
    };

    const copyBankDetails = (bsb, acc, netAmt) => {
        navigator.clipboard.writeText(`${bsb} ${acc} ${netAmt}`);
        alert('Bank details & amount copied to clipboard!');
    };

    return (
        <div className="min-h-screen bg-[#090d16] text-slate-100 font-sans antialiased selection:bg-indigo-500 selection:text-white">
            {/* Global Header */}
            <header className="border-b border-slate-800/60 bg-[#111827]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <span className="font-bold text-base tracking-wider text-indigo-400">SEEDORA</span>
                        <span className="text-xs text-slate-400 border-l border-slate-800 pl-3">Executive Financial Operations</span>
                    </div>
                    <div className="text-xs text-slate-400 flex items-center space-x-2">
                        <span>Tenant:</span>
                        <span className="text-slate-200 font-semibold bg-slate-900 px-2.5 py-1 rounded border border-slate-800">brisbane-grammar-demo</span>
                    </div>
                </div>
            </header>

            {!isUnlocked ? (
                /* State 1: Security Lock Screen */
                <div className="max-w-md mx-auto px-4 py-24">
                    <form onSubmit={handleUnlock} className="bg-[#111827] border border-slate-800/80 rounded-2xl p-8 shadow-2xl">
                        <div className="text-center mb-6">
                            <span className="text-xs uppercase tracking-widest text-indigo-400 bg-indigo-950/80 px-3.5 py-1 rounded-full border border-indigo-800/50 font-semibold">
                                Restricted Area
                            </span>
                            <h2 className="text-xl font-bold tracking-tight mt-4 text-white">Executive Vault Security</h2>
                            <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                                Enter your executive PIN to unlock secure staff banking details and payroll processing.
                            </p>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-slate-300 mb-1.5 font-medium">Security PIN</label>
                                <input 
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    placeholder="Enter PIN (e.g. 1234)..."
                                    className="w-full bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 shadow-inner"
                                />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl text-sm transition-all cursor-pointer shadow-lg shadow-indigo-600/25">
                                Authenticate & Unlock
                            </button>
                        </div>
                        <div className="mt-4 text-center">
                            <button type="button" onClick={() => setIsUnlocked(true)} className="text-xs text-slate-400 hover:text-slate-200 underline decoration-slate-600 transition-colors">
                                [Click here to bypass preview lock]
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                /* State 2: Unlocked Dashboard */
                <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-white">Executive Finance & Payroll Dashboard</h1>
                            <p className="text-sm text-slate-400 mt-1">
                                Manage student receipts, configure staff rates, copy bank details for internet banking, and generate PDF payslips.
                            </p>
                        </div>
                        <button onClick={() => setIsUnlocked(false)} className="bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-xs transition-all cursor-pointer">
                            Lock Vault
                        </button>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex space-x-3 mb-6 border-b border-slate-800/80 pb-4">
                        <button 
                            onClick={() => setActiveTab('students')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'students' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                        >
                            Student Payments & Events
                        </button>
                        <button 
                            onClick={() => setActiveTab('payroll')}
                            className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${activeTab === 'payroll' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                        >
                            Staff Rate Calculator & Payout Queue
                        </button>
                    </div>

                    {/* TAB 1: Student Payments */}
                    {activeTab === 'students' && (
                        <div className="space-y-6">
                            <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4">Record Student Event Payment</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Event / Category</label>
                                        <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100">
                                            <option>Camp 2026</option>
                                            <option>Excursion Fee</option>
                                            <option>School Photos</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Title</label>
                                        <input type="text" defaultValue="Camp 2026 Deposit" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Student Name</label>
                                        <input type="text" defaultValue="Kevin Smith" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Parent Email</label>
                                        <input type="text" defaultValue="robert.smith@gmail.com" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Amount ($)</label>
                                        <input type="number" defaultValue="120.00" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div className="sm:col-span-2 lg:col-span-5 flex justify-end">
                                        <button onClick={() => alert('Payment logged successfully!')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer">
                                            Log Payment Record
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#111827] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
                                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                                    <h3 className="text-sm font-semibold text-slate-200 tracking-wide">Historical Student Payment Ledger</h3>
                                    <span className="text-xs text-slate-400 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">Total: 2 Records</span>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/50 text-xs">
                                                <th className="py-3 px-6 font-medium">Timestamp</th>
                                                <th className="py-3 px-6 font-medium">Event / Description</th>
                                                <th className="py-3 px-6 font-medium">Student Name</th>
                                                <th className="py-3 px-6 font-medium">Parent Account</th>
                                                <th className="py-3 px-6 font-medium text-right">Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-800/60 text-xs">
                                            <tr className="hover:bg-slate-900/40">
                                                <td className="py-4 px-6 text-slate-400">2026-09-29 10:14 AM</td>
                                                <td className="py-4 px-6 text-slate-100 font-medium">Camp 2026</td>
                                                <td className="py-4 px-6 text-indigo-300 font-semibold">Kevin Smith</td>
                                                <td className="py-4 px-6 text-slate-300">robert.smith@gmail.com</td>
                                                <td className="py-4 px-6 text-right font-bold text-emerald-400 text-sm">+$120.00</td>
                                            </tr>
                                            <tr className="hover:bg-slate-900/40">
                                                <td className="py-4 px-6 text-slate-400">2026-09-28 02:45 PM</td>
                                                <td className="py-4 px-6 text-slate-100 font-medium">Excursion Fee</td>
                                                <td className="py-4 px-6 text-indigo-300 font-semibold">Emma Davis</td>
                                                <td className="py-4 px-6 text-slate-300">sarah.davis@outlook.com</td>
                                                <td className="py-4 px-6 text-right font-bold text-emerald-400 text-sm">+$45.00</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: Staff Rate Calculator & Payout Queue */}
                    {activeTab === 'payroll' && (
                        <div className="space-y-6">
                            <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
                                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-1">Executive Pay Rate & Hours Configuration Calculator</h3>
                                <p className="text-xs text-slate-400 mb-5">Adjust individual hourly rates, tax, superannuation, and hours to instantly preview net take-home pay.</p>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Select Staff Member</label>
                                        <select 
                                            value={calc.teacher} 
                                            onChange={(e) => setCalc({...calc, teacher: e.target.value})}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100"
                                        >
                                            <option value="Dr. Alan Grant">Dr. Alan Grant (Science)</option>
                                            <option value="Ms. Ellie Sattler">Ms. Ellie Sattler (Biology)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Standard Hourly Rate ($)</label>
                                        <input type="number" value={calc.hourly} step="0.50" onChange={(e) => setCalc({...calc, hourly: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Overtime Hourly Rate ($)</label>
                                        <input type="number" value={calc.overtime} step="0.50" onChange={(e) => setCalc({...calc, overtime: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">PAYG Tax Percentage (%)</label>
                                        <input type="number" value={calc.taxPct} step="0.5" onChange={(e) => setCalc({...calc, taxPct: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Superannuation (%)</label>
                                        <input type="number" value={calc.superPct} step="0.5" onChange={(e) => setCalc({...calc, superPct: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Regular Hours</label>
                                        <input type="number" value={calc.regHrs} step="1" onChange={(e) => setCalc({...calc, regHrs: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Overtime Hours</label>
                                        <input type="number" value={calc.otHrs} step="1" onChange={(e) => setCalc({...calc, otHrs: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-300 mb-1.5 font-medium">Sick Leave Hours</label>
                                        <input type="number" value={calc.sickHrs} step="1" onChange={(e) => setCalc({...calc, sickHrs: parseFloat(e.target.value) || 0})} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/90 border border-slate-800 p-4 rounded-xl mb-6">
                                    <div>
                                        <span className="text-xs text-slate-400 block mb-1">Gross Pay</span>
                                        <span className="text-base font-bold text-slate-100">${gross.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 block mb-1">Tax Deduction</span>
                                        <span className="text-base font-bold text-rose-400">-${tax.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 block mb-1">Super Contribution</span>
                                        <span className="text-base font-bold text-indigo-300">+${superVal.toFixed(2)}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-slate-400 block mb-1">Net Take-Home Pay</span>
                                        <span className="text-base font-bold text-emerald-400">${net.toFixed(2)}</span>
                                    </div>
                                </div>

                                <div className="flex justify-end">
                                    <button onClick={() => alert('Pay run saved and queued for internet banking payout!')} className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition-all cursor-pointer">
                                        Process & Queue Pay Run
                                    </button>
                                </div>
                            </div>

                            <div className="bg-[#111827] border border-slate-800/80 rounded-2xl p-6 shadow-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h3 class="text-xs font-bold uppercase tracking-wider text-indigo-400">Staff Payout & Internet Banking Queue</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">Copy bank details directly to your online banking portal, then mark as Paid.</p>
                                    </div>
                                    <span className="text-xs text-slate-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800">Secure Direct Deposit</span>
                                </div>

                                <div className="space-y-3">
                                    {payouts.map(p => (
                                        <div key={p.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center space-x-2">
                                                    <span className="font-semibold text-slate-100 text-sm">{p.name}</span>
                                                    <span className="text-[11px] bg-indigo-950 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/60 font-medium">{p.dept}</span>
                                                </div>
                                                <div className="text-xs text-slate-400 flex flex-wrap gap-x-3">
                                                    <span>BSB: <strong className="text-slate-200">{p.bsb}</strong></span>
                                                    <span>Acc: <strong className="text-slate-200">{p.acc}</strong></span>
                                                    <span>Net Payout: <strong className="text-emerald-400 font-bold">{p.net}</strong></span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3 w-full md:w-auto justify-end">
                                                <button onClick={() => copyBankDetails(p.bsb, p.acc, p.net)} className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer">
                                                    Copy Bank Details
                                                </button>
                                                <button onClick={() => setModalData(p)} className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border border-indigo-500/30">
                                                    View PDF Payslip
                                                </button>
                                                <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${p.status === 'Paid' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60' : 'bg-amber-950/80 text-amber-400 border border-amber-800/60'}`}>
                                                    {p.status}
                                                </span>
                                                <button onClick={() => toggleStatus(p.id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${p.status === 'Paid' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                                                    {p.status === 'Paid' ? 'Mark Due' : 'Mark Paid'}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            )}

            {/* Professional PDF Payslip Modal Preview */}
            {modalData && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white text-slate-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                        <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-600">Official Payslip Document Preview</span>
                            <div className="flex space-x-2">
                                <button onClick={() => alert('Downloading PDF with School Logo & Principal Signature...')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer">
                                    Download PDF
                                </button>
                                <button onClick={() => setModalData(null)} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer">
                                    Close
                                </button>
                            </div>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start border-b border-slate-200 pb-6">
                                <div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">S</div>
                                        <span className="font-bold text-lg tracking-tight text-slate-900">SEEDORA GRAMMAR SCHOOL</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">123 Education Drive, Carseldine QLD 4034</p>
                                    <p className="text-xs text-slate-500">ABN: 45 892 102 991</p>
                                </div>
                                <div className="text-right">
                                    <h4 class="text-base font-bold text-slate-800">REMITTANCE ADVICE</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">Pay Period: 14 Sep 2026 - 28 Sep 2026</p>
                                    <p className="text-xs text-slate-500">Payment Date: 28 Sep 2026</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                                <div>
                                    <span className="text-slate-500 block mb-0.5">Employee Name</span>
                                    <strong className="text-slate-900 text-sm">{modalData.name}</strong>
                                </div>
                                <div>
                                    <span className="text-slate-500 block mb-0.5">Direct Deposit Account</span>
                                    <strong className="text-slate-900 font-mono">{modalData.bsb} {modalData.acc}</strong>
                                </div>
                            </div>

                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-300 text-slate-600 font-semibold">
                                        <th className="py-2.5">Description</th>
                                        <th className="py-2.5 text-center">Hours / Units</th>
                                        <th className="py-2.5 text-right">Rate</th>
                                        <th className="py-2.5 text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-slate-700">
                                    <tr>
                                        <td className="py-2.5">Standard Teaching Hours</td>
                                        <td className="py-2.5 text-center">76.0</td>
                                        <td className="py-2.5 text-right">$45.00</td>
                                        <td className="py-2.5 text-right font-medium">$3,420.00</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2.5">Overtime Coverage</td>
                                        <td className="py-2.5 text-center">4.0</td>
                                        <td className="py-2.5 text-right">$67.50</td>
                                        <td className="py-2.5 text-right font-medium">$270.00</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2.5 text-rose-600">PAYG Tax Deduction (30%)</td>
                                        <td className="py-2.5 text-center">-</td>
                                        <td className="py-2.5 text-right">-</td>
                                        <td className="py-2.5 text-right font-medium text-rose-600">-$1,107.00</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2.5 text-indigo-600">Superannuation Contribution (11.5%)</td>
                                        <td className="py-2.5 text-center">-</td>
                                        <td className="py-2.5 text-right">-</td>
                                        <td className="py-2.5 text-right font-medium text-indigo-600">+$424.35</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl">
                                <span className="text-xs uppercase tracking-wider font-semibold">Net Take-Home Pay</span>
                                <span className="text-xl font-bold text-emerald-400">{modalData.net}</span>
                            </div>

                            <div className="flex justify-between items-end pt-6 border-t border-slate-200">
                                <div className="text-xs text-slate-500">
                                    <p>Authorized by School Executive Management.</p>
                                    <p className="mt-1">Generated securely via Seedora Cloud Portal.</p>
                                </div>
                                <div className="text-center">
                                    <div className="font-serif italic text-lg text-indigo-900 border-b border-slate-400 px-8 pb-1">
                                        B. Tremble
                                    </div>
                                    <span className="text-[11px] font-medium text-slate-600 mt-1 block">Principal / Executive Signature</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}