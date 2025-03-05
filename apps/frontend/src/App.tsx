import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from './context/AuthContext';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ClassesPage from './pages/classes/ClassesPage';
import ClassDetailPage from './pages/classes/ClassDetailPage';
import CreateClassPage from './pages/classes/CreateClassPage';
import EditClassPage from './pages/classes/EditClassPage';
import ProfilePage from './pages/profile/ProfilePage';
import NotFoundPage from './pages/NotFoundPage';

// Protected route component
const ProtectedRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return isAuthenticated ? element : <Navigate to="/login" />;
};

const App: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Routes>
      {/* Public routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route 
          path="/dashboard" 
          element={<ProtectedRoute element={<DashboardPage />} />} 
        />
        <Route 
          path="/classes" 
          element={<ProtectedRoute element={<ClassesPage />} />} 
        />
        <Route 
          path="/classes/create" 
          element={<ProtectedRoute element={<CreateClassPage />} />} 
        />
        <Route 
          path="/classes/:classId/edit" 
          element={<ProtectedRoute element={<EditClassPage />} />} 
        />
        <Route 
          path="/classes/:classId" 
          element={<ProtectedRoute element={<ClassDetailPage />} />} 
        />
        <Route 
          path="/profile" 
          element={<ProtectedRoute element={<ProfilePage />} />} 
        />
      </Route>

      {/* 404 route */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
};

export default App;
