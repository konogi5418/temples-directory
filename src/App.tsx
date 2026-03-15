import type { ReactNode } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SharedLogin from './components/SharedLogin';
import DirectoryHome from './components/DirectoryHome';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import AdminAddTemple from './components/AdminAddTemple';

// エラーの原因は、以下の ProtectedRoute の定義が欠落していたことです
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<SharedLogin />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DirectoryHome />
          </ProtectedRoute>
        } 
      />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/add" element={<AdminAddTemple />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;