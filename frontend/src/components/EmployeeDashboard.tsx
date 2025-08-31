import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Briefcase, Users, Eye, CheckCircle, XCircle, Plus, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Job {
  id: number;
  title: string;
  job_type: string;
  description: string;
  created_at: string;
}

interface Application {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  university: string;
  qualifications: string;
  experience: string;
  status: string;
  applied_at: string;
}

const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobApplications, setSelectedJobApplications] = useState<Application[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [applicationsLoading, setApplicationsLoading] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/my-jobs', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobApplications = async (jobId: number) => {
    setApplicationsLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/job-applications/${jobId}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedJobApplications(data);
        setSelectedJobId(jobId);
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
    } finally {
      setApplicationsLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: number, status: string) => {
    try {
      const response = await fetch(`http://localhost:3001/api/applications/${applicationId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) {
        setSelectedJobApplications(prev =>
          prev.map(app =>
            app.id === applicationId ? { ...app, status } : app
          )
        );
        alert(`Application ${status} successfully!`);
      }
    } catch (error) {
      console.error('Error updating application status:', error);
      alert('Failed to update application status');
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    if (window.confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      try {
        const response = await fetch(`http://localhost:3001/api/jobs/${jobId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${user?.token}`,
          },
        });

        if (response.ok) {
          alert('Job deleted successfully!');
          setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
          if (selectedJobId === jobId) {
            setSelectedJobId(null);
            setSelectedJobApplications([]);
          }
        } else {
          alert('Failed to delete job.');
        }
      } catch (error) {
        console.error('Error deleting job:', error);
        alert('An error occurred while deleting the job.');
      }
    }
  };

  const getTotalApplications = () => {
    return selectedJobApplications.length;
  };

  const getPendingApplications = () => {
    return selectedJobApplications.filter(app => app.status === 'pending').length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Employer Dashboard</h1>
              <p className="text-gray-600">Manage your job postings and applications</p>
            </div>
            <Link
              to="/create-job"
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Job
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Briefcase className="h-12 w-12 text-blue-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{jobs.length}</p>
                <p className="text-gray-600">Total Jobs Posted</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Users className="h-12 w-12 text-green-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{getTotalApplications()}</p>
                <p className="text-gray-600">Total Applications</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center">
              <Eye className="h-12 w-12 text-yellow-600" />
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{getPendingApplications()}</p>
                <p className="text-gray-600">Pending Reviews</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Jobs List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">My Job Postings</h2>
            </div>
            
            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Jobs Posted</h3>
                <p className="text-gray-600 mb-4">You haven't posted any jobs yet.</p>
                <Link
                  to="/create-job"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Post Your First Job
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {jobs.map((job) => (
                  <div
                    key={job.id}
                    className={`p-6 cursor-pointer transition-colors ${
                      selectedJobId === job.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div onClick={() => fetchJobApplications(job.id)}>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">{job.title}</h3>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {job.job_type}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">{job.description}</p>
                      <p className="text-sm text-gray-500">
                        Posted on {new Date(job.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent triggering the job selection
                        handleDeleteJob(job.id);
                      }}
                      className="mt-2 flex items-center space-x-1 text-red-600 hover:text-red-800 text-sm transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Applications List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedJobId ? 'Job Applications' : 'Select a Job'}
              </h2>
            </div>
            
            {!selectedJobId ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Job Selected</h3>
                <p className="text-gray-600">Click on a job to view its applications</p>
              </div>
            ) : applicationsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
              </div>
            ) : selectedJobApplications.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Applications</h3>
                <p className="text-gray-600">No students have applied for this job yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {selectedJobApplications.map((application) => (
                  <div key={application.id} className="p-6">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <Link to={`/student/${application.student_id}`} className="hover:underline">
                          <h4 className="font-semibold text-gray-900">
                            {application.first_name} {application.last_name}
                          </h4>
                        </Link>
                        <p className="text-sm text-gray-600">{application.university}</p>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${
                        application.status === 'approved' ? 'bg-green-100 text-green-800' :
                        application.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {application.status}
                      </span>
                    </div>
                    
                    {application.qualifications && (
                      <div className="mb-2">
                        <p className="text-sm font-medium text-gray-700">Qualifications:</p>
                        <p className="text-sm text-gray-600">{application.qualifications}</p>
                      </div>
                    )}
                    
                    {application.experience && (
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">Experience:</p>
                        <p className="text-sm text-gray-600">{application.experience}</p>
                      </div>
                    )}
                    
                    <p className="text-xs text-gray-500 mb-3">
                      Applied on {new Date(application.applied_at).toLocaleDateString()}
                    </p>
                    
                    {application.status === 'pending' && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => updateApplicationStatus(application.id, 'approved')}
                          className="flex items-center space-x-1 px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => updateApplicationStatus(application.id, 'rejected')}
                          className="flex items-center space-x-1 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeDashboard;