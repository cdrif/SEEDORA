import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import GlobalHeader from './GlobalHeader';

export default function ParentBHE() {
  const [loading, setLoading] = useState(true);
  const [behaviors, setBehaviors] = useState([]);

  useEffect(() => {
    async function initParentBHE() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');

        // Fetch parent's school slug
        const { data: memberData } = await supabase
          .from('school_members')
          .select('school_slug')
          .eq('user_id', user.id)
          .single();

        const currentSlug = memberData?.school_slug;

        // Fetch historical behavior logs for students in this school tenant
        const { data: behaviorData, error: bError } = await supabase
          .from('student_behaviors')
          .select('*, students(first_name, last_name, grade_level)')
          .eq('school_slug', currentSlug)
          .order('created_at', { ascending: false });

        if (bError) throw bError;
        setBehaviors(behaviorData || []);

      } catch (err) {
        console.error('Error loading parent behavior records:', err.message);
      } finally {
        setLoading(false);
      }
    }

    initParentBHE();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-white">
      <GlobalHeader />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight">Child Behavior & Conduct History</h1>
          <p className="text-sm text-gray-400 mt-1">
            Review past and present behavioral logs, teacher actions, and notices securely stored for your family records.
          </p>
        </div>

        {loading ? (
          <div className="text-gray-400">Loading records...</div>
        ) : (
          <div className="bg-[#111827] border border-gray-800 rounded-xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center">
              <h3 className="text-base font-semibold text-gray-100">Historical Incident Logs</h3>
              <span className="text-xs font-mono text-gray-400 bg-gray-900 px-3 py-1 rounded border border-gray-800">
                Total Logs: {behaviors.length}
              </span>
            </div>

            {behaviors.length === 0 ? (
              <div className="p-6 text-gray-400 text-sm">No behavior or incident reports found on file.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 bg-gray-900/50 font-mono text-xs">
                      <th className="py-3 px-6">Timestamp (UTC)</th>
                      <th className="py-3 px-6">Student</th>
                      <th className="py-3 px-6">Severity</th>
                      <th className="py-3 px-6">Description</th>
                      <th className="py-3 px-6">Action Taken</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 font-mono text-xs">
                    {behaviors.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-900/30 transition-colors">
                        <td className="py-3 px-6 text-gray-300">
                          {new Date(item.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-6 text-gray-200 font-sans font-medium">
                          {item.students ? `${item.students.first_name} ${item.students.last_name}` : 'Student'}
                        </td>
                        <td className="py-3 px-6">
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${
                            item.severity === 'severe' ? 'bg-red-950 text-red-400 border border-red-800' :
                            item.severity === 'moderate' ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' :
                            'bg-gray-800 text-gray-300'
                          }`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="py-3 px-6 text-gray-300">
                          {item.description}
                        </td>
                        <td className="py-3 px-6 text-indigo-300">
                          {item.action_taken || 'None recorded'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}