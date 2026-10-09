import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function TeacherPortalNav({ activeTab, schoolSlug }) {
  const [enabledFeatures, setEnabledFeatures] = useState({});

  useEffect(() => {
    async function fetchFlags() {
      if (!schoolSlug) return;
      const { data, error } = await supabase
        .from('school_feature_flags')
        .select('feature_key, is_enabled')
        .eq('school_slug', schoolSlug)
        .eq('role', 'teacher');

      if (!error && data) {
        const flags = {};
        data.forEach(row => { flags[row.feature_key] = row.is_enabled; });
        setEnabledFeatures(flags);
      }
    }
    fetchFlags();
  }, [schoolSlug]);

  const allNavItems = [
    { name: 'Overview', key: 'overview', path: `/${schoolSlug}/teacher` },
    { name: 'School Hub', key: 'hub', path: `/${schoolSlug}/teacher/hub` },
    { name: 'Homework', key: 'homework', path: `/${schoolSlug}/teacher/homework` },
    { name: 'Report Cards', key: 'report_cards', path: `/${schoolSlug}/teacher/report-cards` },
    { name: 'Behaviour', key: 'behaviour', path: `/${schoolSlug}/teacher/behaviour` },
    { name: 'Events', key: 'events', path: `/${schoolSlug}/teacher/events` },
    { name: 'Sports Management', key: 'sports', path: `/${schoolSlug}/teacher/sports` },
    { name: 'Attendance', key: 'attendance', path: `/${schoolSlug}/teacher/attendance` },
  ];

  const visibleItems = allNavItems.filter(item => enabledFeatures[item.key] !== false);

  return (
    <nav className="bg-[#111827] border-b border-gray-800 px-6 py-3 flex space-x-6 text-sm font-medium overflow-x-auto">
      {visibleItems.map((item) => {
        const isActive = activeTab === item.name;
        return (
          <a
            key={item.name}
            href={item.path}
            className={`transition-colors pb-1 whitespace-nowrap ${
              isActive ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            {item.name}
          </a>
        );
      })}
    </nav>
  );
}