import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function ParentPortalNav({ activeTab, schoolSlug }) {
  const [features, setFeatures] = useState({});

  useEffect(() => {
    async function fetchSchoolFeatures() {
      if (!schoolSlug) return;
      
      // 1. Get the school ID using the schoolSlug
      const { data: schoolData } = await supabase
        .from('schools')
        .select('id')
        .eq('slug', schoolSlug)
        .single();

      if (!schoolData?.id) return;

      // 2. Fetch the feature matrix JSON blob from school_features
      const { data, error } = await supabase
        .from('school_features')
        .select('features')
        .eq('school_id', schoolData.id)
        .single();

      if (!error && data?.features) {
        setFeatures(data.features);
      }
    }
    fetchSchoolFeatures();
  }, [schoolSlug]);

  // Map each navbar item to its exact camelCase key from defaultFeatures
  const allNavItems = [
    { name: 'Overview', key: 'parentOverview', path: `/${schoolSlug}/parent` },
    { name: 'Daily Schedule', key: 'parentDailySchedule', path: `/${schoolSlug}/parent/schedule` },
    { name: 'Canteen', key: 'parentCanteen', path: `/${schoolSlug}/parent/canteen` },
    { name: 'Digital ID', key: 'parentDigitalId', path: `/${schoolSlug}/parent/digital-id` },
    { name: 'Events', key: 'parentEvents', path: `/${schoolSlug}/parent/events` },
    { name: 'Homework', key: 'parentHomework', path: `/${schoolSlug}/parent/homework` },
    { name: 'School Hub', key: 'parentHub', path: `/${schoolSlug}/parent/hub` },
    { name: 'Sports', key: 'parentSports', path: `/${schoolSlug}/parent/sports` },
    { name: 'Bus Planner', key: 'parentBusPlanner', path: `/${schoolSlug}/transport` },
    { name: 'Report Cards', key: 'parentReportCards', path: `/${schoolSlug}/parent/report-cards` },
    { name: 'Lost and Found', key: 'parentLostAndFound', path: `/${schoolSlug}/parent/lost-and-found` },
    { name: 'Behavior', key: 'parentBehavior', path: `/${schoolSlug}/parent/behavior` },
  ];

  // Filter items based on the JSON feature matrix (defaults to true if undefined)
  const visibleItems = allNavItems.filter(item => {
    return features[item.key] !== false;
  });

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