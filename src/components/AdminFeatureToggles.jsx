import { useState, useEffect } from 'react';
import { supabase } from '../supabase';

const PORTAL_FEATURES = {
  parent: [
    { key: 'overview', label: 'Overview' },
    { key: 'hub', label: 'School Hub' },
    { key: 'homework', label: 'Homework' },
    { key: 'bus_planner', label: 'Bus Planner' },
    { key: 'report_cards', label: 'Report Cards' },
    { key: 'canteen', label: 'Canteen' },
    { key: 'behaviour', label: 'Behaviour' },
    { key: 'events', label: 'School Events Calendar' },
    { key: 'sports', label: 'Sports Days & Carnivals' },
    { key: 'library', label: 'Library' },
  ],
  teacher: [
    { key: 'overview', label: 'Overview' },
    { key: 'hub', label: 'School Hub' },
    { key: 'homework', label: 'Homework' },
    { key: 'report_cards', label: 'Report Cards' },
    { key: 'behaviour', label: 'Behaviour' },
    { key: 'events', label: 'School Events Calendar' },
    { key: 'sports', label: 'Sports Field & Heat Management' },
    { key: 'attendance', label: 'Attendance' },
  ],
  admin: [
    { key: 'overview', label: 'Overview' },
    { key: 'hub', label: 'School Hub' },
    { key: 'awards', label: 'Awards' },
    { key: 'behaviour', label: 'Behaviour' },
    { key: 'events', label: 'School Events Calendar' },
    { key: 'sports', label: 'Sports Carnival Administration' },
    { key: 'report_cards', label: 'Report Cards' },
    { key: 'audit_logs', label: 'Audit Logs' },
  ],
};

export default function AdminFeatureToggles() {
  const [verifying, setVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [schoolSlug, setSchoolSlug] = useState('');
  const [selectedRole, setSelectedRole] = useState('parent');
  const [flags, setFlags] = useState({});
  const [loadingFlags, setLoadingFlags] = useState(false);
  const [savingKey, setSavingKey] = useState(null);

  // 1. Security Check on Mount: Verify user is an admin
  useEffect(() => {
    async function verifyAdminAccess() {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');

        const { data: memberData, error: memberError } = await supabase
          .from('school_members')
          .select('role, school_slug')
          .eq('user_id', user.id)
          .single();

        if (memberError || !memberData || memberData.role !== 'admin') {
          throw new Error('Access denied: Administrator privileges required.');
        }

        setIsAuthorized(true);
        setSchoolSlug(memberData.school_slug || 'default-school');
      } catch (err) {
        console.error('Security verification failed:', err.message);
        setIsAuthorized(false);
      } finally {
        setVerifying(false);
      }
    }

    verifyAdminAccess();
  }, []);

  // 2. Fetch Feature Flags when school slug or role changes
  useEffect(() => {
    if (!isAuthorized || !schoolSlug) return;

    async function fetchFlags() {
      setLoadingFlags(true);
      const { data, error } = await supabase
        .from('school_feature_flags')
        .select('feature_key, is_enabled')
        .eq('school_slug', schoolSlug)
        .eq('role', selectedRole);

      const flagMap = {};
      PORTAL_FEATURES[selectedRole].forEach(f => { flagMap[f.key] = true; });

      if (!error && data) {
        data.forEach(row => { flagMap[row.feature_key] = row.is_enabled; });
      }

      setFlags(flagMap);
      setLoadingFlags(false);
    }

    fetchFlags();
  }, [isAuthorized, schoolSlug, selectedRole]);

  // 3. Toggle Feature Handler
  const handleToggle = async (featureKey) => {
    const currentState = flags[featureKey] ?? true;
    const newState = !currentState;

    setFlags(prev => ({ ...prev, [featureKey]: newState }));
    setSavingKey(featureKey);

    try {
      const { error } = await supabase
        .from('school_feature_flags')
        .upsert({
          school_slug: schoolSlug,
          role: selectedRole,
          feature_key: featureKey,
          is_enabled: newState
        }, { onConflict: 'school_slug,role,feature_key' });

      if (error) throw error;
    } catch (err) {
      console.error('Failed to update feature flag:', err.message);
      setFlags(prev => ({ ...prev, [featureKey]: currentState }));
      alert('Error updating feature flag: ' + err.message);
    } finally {
      setSavingKey(null);
    }
  };

  if (verifying) {
    return <div className="p-6 text-gray-400 text-sm bg-[#111827] rounded-xl">Verifying administrative security...</div>;
  }

  if (!isAuthorized) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-900 rounded-xl text-red-200 text-sm max-w-xl">
        <h3 className="font-semibold text-base mb-1">Access Denied</h3>
        <p>You do not have the required administrator privileges to view or modify the feature matrix.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111827] border border-gray-800 rounded-xl p-6 shadow-sm text-white">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-100">Portal Navigation Feature Matrix</h2>
        <p className="text-sm text-gray-400 mt-1">
          Enable or disable specific navigation tabs dynamically for your school ({schoolSlug})[cite: 6].
        </p>
      </div>

      {/* Controls: Target School Slug & Role Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1">Target School Slug:</label>
          <input 
            type="text"
            value={schoolSlug}
            onChange={(e) => setSchoolSlug(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        <div>
          <label className="block text-xs font-mono text-gray-400 mb-1">Select Portal Role:</label>
          <select 
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
          >
            <option value="parent">Parent Portal</option>
            <option value="teacher">Teacher Portal</option>
            <option value="admin">Admin Portal</option>
          </select>
        </div>
      </div>

      {/* Feature Toggles List */}
      {loadingFlags ? (
        <div className="text-gray-400 text-sm py-4">Loading matrix configuration...</div>
      ) : (
        <div className="space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-gray-400 mb-3">
            Available Navigation Tabs for {selectedRole.toUpperCase()}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PORTAL_FEATURES[selectedRole].map((feature) => {
              const isEnabled = flags[feature.key] ?? true;
              const isSaving = savingKey === feature.key;

              return (
                <div 
                  key={feature.key}
                  className="flex items-center justify-between p-3.5 bg-gray-900/60 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-gray-200">{feature.label}</span>
                    <span className="block text-[10px] font-mono text-gray-500">Key: {feature.key}</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggle(feature.key)}
                    disabled={isSaving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                      isEnabled ? 'bg-indigo-600' : 'bg-gray-700'
                    } ${isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        isEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}