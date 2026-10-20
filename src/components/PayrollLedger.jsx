export default function PayrollLedger({
  pendingRecords,
  approvedLedger,
  reliefName,
  setReliefName,
  reliefDate,
  setReliefDate,
  reliefHours,
  setReliefHours,
  onApprove,
  onReliefSubmit,
  onExportCSV
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-100">Teacher Attendance Approvals & Payroll Ledger</h2>
        <p className="text-sm text-gray-400">Review teacher check-ins, manage relief teacher payouts, and export verified ledger data.</p>
      </div>

      {/* Pending Approvals Queue */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Pending Teacher Submissions (Awaiting Approval)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase font-mono">
                <th className="py-2 px-3">Staff Member</th>
                <th className="py-2 px-3">Status Type</th>
                <th className="py-2 px-3">Timestamp</th>
                <th className="py-2 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {pendingRecords.length === 0 ? (
                <tr><td colSpan="4" className="py-4 text-center text-gray-500 text-xs">No pending submissions found.</td></tr>
              ) : (
                pendingRecords.map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-800/40">
                    <td className="py-2 px-3 font-medium text-white">{rec.profiles?.full_name || 'Staff Member'}</td>
                    <td className="py-2 px-3"><span className={`px-2 py-0.5 rounded text-xs ${rec.status_type === 'Present' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{rec.status_type}</span></td>
                    <td className="py-2 px-3 text-gray-300 text-xs">{new Date(rec.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">
                      <button onClick={() => onApprove(rec.id)} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-3 py-1 rounded transition cursor-pointer">
                        Approve & Pay
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Relief Teacher Entry Form */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-1">Manual Relief Teacher Entry</h3>
        <p className="text-xs text-gray-400 mb-3">Add relief staff manually directly into the approved payment ledger.</p>
        <form onSubmit={onReliefSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">Relief Teacher Name</label>
            <input type="text" value={reliefName} onChange={e => setReliefName(e.target.value)} required placeholder="e.g. John Doe" className="w-full bg-black border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs" />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">Date</label>
            <input type="date" value={reliefDate} onChange={e => setReliefDate(e.target.value)} required className="w-full bg-black border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs" />
          </div>
          <div>
            <label className="block text-[11px] font-mono text-gray-400 mb-1">Hours Worked</label>
            <input type="number" step="0.5" value={reliefHours} onChange={e => setReliefHours(e.target.value)} required className="w-full bg-black border border-gray-800 rounded px-2.5 py-1.5 text-white text-xs" />
          </div>
          <div className="flex items-end">
            <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-1.5 rounded text-xs transition cursor-pointer">
              Add Relief to Ledger
            </button>
          </div>
        </form>
      </div>

      {/* Approved Payment Ledger & Export */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="text-sm font-semibold text-white">Approved Payment Ledger</h3>
            <p className="text-xs text-gray-400">Verified entries ready for payroll or government reimbursement.</p>
          </div>
          <button onClick={onExportCSV} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-3 py-1.5 rounded transition shadow cursor-pointer">
            Download CSV
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase font-mono">
                <th className="py-2 px-3">Staff / Relief Name</th>
                <th className="py-2 px-3">Type</th>
                <th className="py-2 px-3">Date / Timestamp</th>
                <th className="py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {approvedLedger.length === 0 ? (
                <tr><td colSpan="4" className="py-4 text-center text-gray-500 text-xs">No approved records in payment ledger.</td></tr>
              ) : (
                approvedLedger.map(rec => (
                  <tr key={rec.id} className="hover:bg-gray-800/40">
                    <td className="py-2 px-3 font-medium text-white">{rec.profiles?.full_name || rec.relief_teacher_name || 'Relief Staff'}</td>
                    <td className="py-2 px-3 text-gray-300 text-xs">{rec.status_type}</td>
                    <td className="py-2 px-3 text-gray-300 text-xs">{new Date(rec.timestamp).toLocaleString()}</td>
                    <td className="py-2 px-3"><span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-400 font-semibold">Approved</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}