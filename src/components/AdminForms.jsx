export function TeacherProvisioningPanel({
  teacherName, setTeacherName,
  teacherEmail, setTeacherEmail,
  teacherPassword, setTeacherPassword,
  registeringTeacher, onRegister
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-100">Register New Teacher Account</h2>
      <p className="text-sm text-gray-400 mb-4">Directly provision a teacher profile bound to your school slug with pre-assigned role privileges.</p>
      
      <form onSubmit={onRegister} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1">Teacher Full Name:</label>
          <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder="Jane Doe" className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" required />
        </div>
        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1">Teacher Email Address:</label>
          <input type="email" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} placeholder="teacher@school.edu" className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" required />
        </div>
        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1">Temporary Password:</label>
          <input type="password" value={teacherPassword} onChange={(e) => setTeacherPassword(e.target.value)} placeholder="••••••••" className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" required />
        </div>
        <button type="submit" disabled={registeringTeacher} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
          {registeringTeacher ? 'Registering Teacher...' : 'Provision Teacher Account'}
        </button>
      </form>
    </div>
  );
}

export function TeacherInvitePanel({
  inviteGrade, setInviteGrade,
  inviting, onGenerateInvite, generatedInviteLink
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-100">Generate Secure Teacher Invite Link</h2>
      <p className="text-sm text-gray-400 mb-4">Create an automated registration link for a new teacher bound to your school.</p>
      
      <form onSubmit={onGenerateInvite} className="space-y-4 max-w-xl">
        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1">Assigned Grade Level:</label>
          <input type="text" value={inviteGrade} onChange={(e) => setInviteGrade(e.target.value)} placeholder="e.g., Grade 5 or High School Science" className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" required />
        </div>
        <button type="submit" disabled={inviting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
          {inviting ? 'Generating...' : 'Generate Invite Link'}
        </button>
      </form>

      {generatedInviteLink && (
        <div className="mt-4 p-4 bg-gray-900 border border-gray-700 rounded-lg">
          <p className="text-xs text-gray-400 mb-1">Share this secure link with the teacher:</p>
          <input type="text" readOnly value={generatedInviteLink} className="w-full bg-black border border-gray-800 p-2 rounded text-indigo-300 text-xs font-mono select-all" />
        </div>
      )}
    </div>
  );
}

export function DataIngestionPanel({
  importType, setImportType,
  csvInput, setCsvInput,
  importingData, onIngest
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-100">Bulk Data Ingestion (CSV)</h2>
      <p className="text-sm text-gray-400 mb-4">Import student directories or generate teacher invite slots in bulk using standard CSV format.</p>
      
      <form onSubmit={onIngest} className="space-y-4 max-w-2xl">
        <div className="flex space-x-6">
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
            <input type="radio" name="importType" value="students" checked={importType === 'students'} onChange={() => setImportType('students')} className="text-indigo-600 focus:ring-indigo-500 bg-gray-900 border-gray-700" />
            <span>Import Students</span>
          </label>
          <label className="flex items-center space-x-2 text-sm text-gray-300 cursor-pointer">
            <input type="radio" name="importType" value="teachers" checked={importType === 'teachers'} onChange={() => setImportType('teachers')} className="text-indigo-600 focus:ring-indigo-500 bg-gray-900 border-gray-700" />
            <span>Import Teacher Roster (Invites)</span>
          </label>
        </div>

        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1">
            Paste CSV Data (Format: <span className="text-indigo-400">first_name, last_name, grade_level</span>):
          </label>
          <textarea value={csvInput} onChange={(e) => setCsvInput(e.target.value)} placeholder="first_name,last_name,grade_level&#10;John,Doe,Grade 9&#10;Jane,Smith,Grade 10" className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs font-mono text-white h-32 resize-none focus:border-indigo-500 focus:outline-none" required />
        </div>

        <button type="submit" disabled={importingData} className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
          {importingData ? 'Ingesting Records...' : `Process & Ingest ${importType === 'students' ? 'Students' : 'Teachers'}`}
        </button>
      </form>
    </div>
  );
}

export function StudentTeacherLinkPanel({
  students, teachers,
  selectedLinkStudent, setSelectedLinkStudent,
  selectedLinkTeacher, setSelectedLinkTeacher,
  linkJustification, setLinkJustification,
  savingLink, onSaveLink
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-100">Manual Student-Teacher Linking</h2>
      <p className="text-sm text-gray-400 mb-4">Manually assign a student relationship mapping and record administrative approval with proof of authorization.</p>
      
      <form onSubmit={onSaveLink} className="space-y-4 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Select Student:</label>
            <select value={selectedLinkStudent} onChange={(e) => setSelectedLinkStudent(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" required>
              <option value="" disabled>-- Choose Student --</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.first_name} {s.last_name} ({s.grade_level || 'General'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono text-gray-400 mb-1">Select Teacher:</label>
            <select value={selectedLinkTeacher} onChange={(e) => setSelectedLinkTeacher(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" required>
              <option value="" disabled>-- Choose Teacher --</option>
              {teachers.map(t => (
                <option key={t.user_id} value={t.user_id}>{t.profiles?.full_name || 'Teacher Staff'} ({t.user_id.slice(0, 8)}...)</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1">Authorization Reference / Consent Ticket ID:</label>
          <input type="text" value={linkJustification} onChange={(e) => setLinkJustification(e.target.value)} placeholder="e.g., Parent Email Approval #4829 or Principal Signed Form" className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white" required />
          <p className="text-[11px] text-gray-500 mt-1">Required for auditor provenance: enter the ticket or reference number supporting this manual override.</p>
        </div>

        <button type="submit" disabled={savingLink} className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer shadow-md">
          {savingLink ? 'Saving Link...' : 'Save Link & Log Provenance'}
        </button>
      </form>
    </div>
  );
}

export function ReportCardsPanel({
  reportGradeFilter, setReportGradeFilter,
  selectedReportStudent, setSelectedReportStudent,
  reportFilteredStudents, onPrintIndividual, onMassPrint
}) {
  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-100">Student Report Cards & Batch Actions</h2>
      <p className="text-sm text-gray-400 mb-4">Search and select students by grade level for preview or bulk printing operations.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="mb-4">
            <label className="block text-xs font-mono text-gray-400 mb-1">Filter by Grade Level:</label>
            <select value={reportGradeFilter} onChange={(e) => setReportGradeFilter(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white">
              <option value="all">All Grades</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-mono text-gray-400 mb-1">Select Student:</label>
            <select value={selectedReportStudent} onChange={(e) => setSelectedReportStudent(e.target.value)} className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white">
              <option value="" disabled>Select student from directory...</option>
              {reportFilteredStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.first_name} {student.last_name} (ID: {student.id}) - {student.grade_level || 'General'}
                </option>
              ))}
            </select>
          </div>

          <button type="button" onClick={onPrintIndividual} className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
            Print Individual Report
          </button>
        </div>

        <div className="border-t md:border-t-0 md:border-l border-gray-800 pt-4 md:pt-0 md:pl-6 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-200 mb-1">Mass Print Operations</h3>
            <p className="text-xs text-gray-400 mb-4">Print all generated report cards in bulk for compliance archiving.</p>
          </div>
          <div className="space-y-3">
            <button type="button" onClick={() => onMassPrint('grade')} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
              Mass Print Selected Grade
            </button>
            <button type="button" onClick={() => onMassPrint('school')} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors cursor-pointer">
              Mass Print School-Wide
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}