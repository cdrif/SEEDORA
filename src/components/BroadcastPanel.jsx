export default function BroadcastPanel({
  adminSenders,
  alertSender, setAlertSender,
  alertMessage, setAlertMessage,
  onAlertSubmit,
  broadcastSender, setBroadcastSender,
  broadcastMessage, setBroadcastMessage,
  onBroadcastSubmit
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Box 1: Critical Alerts Centre */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 relative overflow-hidden shadow-sm">
        <h2 className="text-lg font-semibold text-gray-100">Critical Alerts Centre</h2>
        <p className="text-sm text-gray-400 mb-4">Send instant push notifications exclusively to registered teachers.</p>
        
        <form onSubmit={onAlertSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Authorised Sender:</label>
            <select value={alertSender} onChange={(e) => setAlertSender(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" required>
              <option value="" disabled>Select Admin...</option>
              {adminSenders.map((name, idx) => (
                <option key={idx} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Alert Description / Message:</label>
            <textarea value={alertMessage} onChange={(e) => setAlertMessage(e.target.value)} placeholder="Type critical alert message for teachers..." className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white h-24 resize-none" required />
          </div>
          <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer">
            Send Push to Teachers
          </button>
        </form>
      </div>

      {/* Box 2: School Wide Broadcast System */}
      <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 relative overflow-hidden shadow-sm">
        <h2 className="text-lg font-semibold text-gray-100">School Wide Broadcast System</h2>
        <p className="text-sm text-gray-400 mb-4">Send broadcasts to verified parents linked under the school slug.</p>
        
        <form onSubmit={onBroadcastSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Authorised Sender:</label>
            <select value={broadcastSender} onChange={(e) => setBroadcastSender(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" required>
              <option value="" disabled>Select Admin...</option>
              {adminSenders.map((name, idx) => (
                <option key={idx} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Broadcast Description / Message:</label>
            <textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} placeholder="Type school-wide message for verified parents..." className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white h-24 resize-none" required />
          </div>
          <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors cursor-pointer">
            Broadcast to Parents
          </button>
        </form>
      </div>
    </div>
  );
}