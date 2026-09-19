import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Splash from './components/Splash';
import Login from './components/Login';
import ParentEvents from './components/Parent-Events';
import TeachEvents from './components/Teach-Events';
import AdminEvents from './components/Admin-Events';
import SportsManagementAdmin from './components/SportsManagementAdmin';
import SportsManagementTeacher from './components/SportsManagementTeacher';
import SportsViewParent from './components/SportsViewParent';
import BugReportWidget from './components/BugReportWidget'; // Added global bug reporter

export default function App() {
  return (
    <BrowserRouter>
      {/* Global Bug Reporter Widget (Automatically hides on login/splash) */}
      <BugReportWidget />

      <Routes>
        {/* Splash Screen Entry Point */}
        <Route path="/" element={<Splash />} />

        {/* Public Login Route */}
        <Route path="/login" element={<Login />} />

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