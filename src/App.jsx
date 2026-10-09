import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase'; // Adjust path if supabase.js is in a subfolder
import Splash from './components/Splash';
import Login from './components/Login';
import ParentEvents from './components/Parent-Events';
import TeachEvents from './components/Teach-Events';
import AdminEvents from './components/Admin-Events';
import SportsManagementAdmin from './components/SportsManagementAdmin';
import SportsManagementTeacher from './components/SportsManagementTeacher';
import SportsViewParent from './components/SportsViewParent';
import BugReportWidget from './components/BugReportWidget';
import SuperAdminDashboard from './components/SuperAdminDashboard';
import AdminFeatureToggles from './components/AdminFeatureToggles';

export default function App() {
  // Test Supabase connection on initial app load
  useEffect(() => {
    async function checkConnection() {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Supabase connection error:', error.message);
      } else {
        console.log('Supabase connected successfully! Session:', data);
      }
    }
    checkConnection();
  }, []);

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      {/* Global Bug Reporter Widget */}
      <BugReportWidget />

      <Routes>
        {/* Splash Screen Entry Point */}
        <Route path="/" element={<Splash />} />

        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

        {/* Super Admin Management Dashboard Route */}
        <Route path="/superadmin" element={<SuperAdminDashboard />} />

        {/* Feature Matrix Control Route */}
        <Route path="/superadmin/features" element={<AdminFeatureToggles />} />

        {/* Dynamic Role Routes */}
        <Route path="/:schoolSlug/parent" element={<ParentEvents />} />
        <Route path="/:schoolSlug/teacher" element={<TeachEvents />} />
        <Route path="/:schoolSlug/admin" element={<AdminEvents />} />

        {/* Sports Day & Carnivals Modules */}
        <Route path="/:schoolSlug/admin/sports" element={<SportsManagementAdmin />} />
        <Route path="/:schoolSlug/teacher/sports" element={<SportsManagementTeacher />} />
        <Route path="/:schoolSlug/parent/sports" element={<SportsViewParent />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}