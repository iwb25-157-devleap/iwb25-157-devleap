import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, Building, Mail, GraduationCap, Award, Briefcase, Edit, Save } from 'lucide-react';

interface Profile {
  email: string;
  company_name?: string;
  contact_person?: string;
  industry?: string;
  first_name?: string;
  last_name?: string;
  university?: string;
  qualifications?: string;
  experience?: string;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [qualifications, setQualifications] = useState('');
  const [experience, setExperience] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/profile', {
        headers: {
          'Authorization': `Bearer ${user?.token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data);
        setQualifications(data.qualifications || '');
        setExperience(data.experience || '');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`,
        },
        body: JSON.stringify({
          qualifications,
          experience,
        }),
      });

      if (response.ok) {
        setProfile(prev => prev ? { ...prev, qualifications, experience } : null);
        setEditing(false);
        alert('Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Profile not found</h2>
          <p className="text-gray-600">There was an error loading your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-8">
            <div className="flex items-center space-x-4">
              <div className="bg-white rounded-full p-3">
                <User className="h-8 w-8 text-blue-600" />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold">
                  {user?.userType === 'student' 
                    ? `${profile.first_name} ${profile.last_name}`
                    : profile.contact_person
                  }
                </h1>
                <p className="text-blue-100">
                  {user?.userType === 'student' ? 'Student' : 'Employer'}
                </p>
              </div>
            </div>
          </div>

          <div className="p-6">
            {/* Basic Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Mail className="h-5 w-5 mr-2 text-blue-600" />
                Contact Information
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-gray-900">{profile.email}</p>
                  </div>
                  {user?.userType === 'employee' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Company</label>
                        <p className="mt-1 text-gray-900">{profile.company_name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Industry</label>
                        <p className="mt-1 text-gray-900">{profile.industry}</p>
                      </div>
                    </>
                  )}
                  {user?.userType === 'student' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">University</label>
                      <p className="mt-1 text-gray-900">{profile.university}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Student-specific sections */}
            {user?.userType === 'student' && (
              <>
                {/* Qualifications */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                      <GraduationCap className="h-5 w-5 mr-2 text-blue-600" />
                      Qualifications
                    </h2>
                    {!editing && (
                      <button
                        onClick={() => setEditing(true)}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                    )}
                  </div>
                  {editing ? (
                    <div>
                      <textarea
                        value={qualifications}
                        onChange={(e) => setQualifications(e.target.value)}
                        placeholder="Add your educational background, certifications, skills, etc."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">
                        {profile.qualifications || 'No qualifications added yet. Click Edit to add your educational background and skills.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Experience */}
                <div className="mb-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2 text-blue-600" />
                    Experience
                  </h2>
                  {editing ? (
                    <div>
                      <textarea
                        value={experience}
                        onChange={(e) => setExperience(e.target.value)}
                        placeholder="Add your work experience, internships, projects, etc."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <div className="flex space-x-3 mt-4">
                        <button
                          onClick={handleSave}
                          className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          <span>Save Changes</span>
                        </button>
                        <button
                          onClick={() => {
                            setEditing(false);
                            setQualifications(profile.qualifications || '');
                            setExperience(profile.experience || '');
                          }}
                          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-700">
                        {profile.experience || 'No experience added yet. Click Edit to add your work experience and projects.'}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* Employee-specific sections */}
            {user?.userType === 'employee' && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2 text-blue-600" />
                  Company Information
                </h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Company Name</label>
                      <p className="mt-1 text-gray-900">{profile.company_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Contact Person</label>
                      <p className="mt-1 text-gray-900">{profile.contact_person}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700">Industry</label>
                      <p className="mt-1 text-gray-900">{profile.industry}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;