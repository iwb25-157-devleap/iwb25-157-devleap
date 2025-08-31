import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import StudentDashboard from '../components/StudentDashboard';
import EmployeeDashboard from '../components/EmployeeDashboard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user.userType === 'student' ? <StudentDashboard /> : <EmployeeDashboard />}
    </div>
  );
};

export default Dashboard;