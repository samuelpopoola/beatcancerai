import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { databaseService } from '../services/database';
import { aiAnalysisService } from '../services/aiAnalysisService';

interface DashboardData {
  upcomingAppointments: any[];
  activeMedications: any[];
  recentTasks: any[];
  carePlanProgress: {
    completed: number;
    inProgress: number;
    total: number;
    percentage: number;
  };
  aiInsights: {
    title: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    priority: 'high' | 'medium' | 'low';
  }[];
}

const Dashboard: React.FC = () => {
  const { user } = useApp();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadDashboardData(user.id);
    }
  }, [user]);

  const loadDashboardData = async (userId: string) => {
    try {
      const [
        appointments,
        medications,
        tasks,
        userProfile
      ] = await Promise.all([
        databaseService.getUpcomingAppointments(userId),
        databaseService.getActiveMedications(userId),
        databaseService.getRecentTasks(userId),
        databaseService.getUserProfile(userId)
      ]);

      // Calculate care plan progress
      const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
      const inProgressTasks = tasks.filter((t: any) => t.status === 'in-progress').length;
      const totalTasks = tasks.length;
      const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Generate AI insights based on user data
      const insights = await generateAIInsights(userProfile, tasks, medications);

      setDashboardData({
        upcomingAppointments: appointments,
        activeMedications: medications,
        recentTasks: tasks.slice(0, 5),
        carePlanProgress: {
          completed: completedTasks,
          inProgress: inProgressTasks,
          total: totalTasks,
          percentage: progressPercentage
        },
        aiInsights: insights
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAIInsights = async (userProfile: any, tasks: any[], medications: any[]) => {
    // This would integrate with real AI in production
    const insights: any[] = [];
    
    if (userProfile?.cancer_type && userProfile?.cancer_stage) {
      insights.push({
        title: 'Treatment Protocol Match',
        message: `Your care plan aligns with NCCN guidelines for ${userProfile.cancer_type} stage ${userProfile.cancer_stage}.`,
        type: 'success' as const,
        priority: 'medium' as const
      });
    }
    
    if ((medications || []).length === 0) {
      insights.push({
        title: 'Medication Review Needed',
        message: 'No active medications recorded. Consider discussing symptom management with your care team.',
        type: 'warning' as const,
        priority: 'medium' as const
      });
    }
    
    const upcomingTasks = (tasks || []).filter(t => t.status === 'upcoming');
    if (upcomingTasks.length > 3) {
      insights.push({
        title: 'Upcoming Care Activities',
        message: `You have ${upcomingTasks.length} upcoming care activities this week.`,
        type: 'info' as const,
        priority: 'low' as const
      });
    }
    
    return insights;
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading dashboard...</div>;
  }

  if (!dashboardData) {
    return <div>Error loading dashboard data</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome back, {user?.user_metadata?.full_name || 'User'}
        </h1>
        <p className="text-gray-600 mt-1">
          Here's your personalized care overview for today
        </p>
      </div>

      {/* AI Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">AI Care Insights</h2>
          <div className="space-y-4">
            {dashboardData.aiInsights.map((insight, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  insight.type === 'warning'
                    ? 'bg-yellow-50 border-yellow-200'
                    : insight.type === 'success'
                    ? 'bg-green-50 border-green-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start">
                  {insight.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3 mt-0.5" />}
                  {insight.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600 mr-3 mt-0.5" />}
                  {insight.type === 'info' && <TrendingUp className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />}
                  <div>
                    <h3 className="font-semibold text-gray-800">{insight.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">{insight.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Care Plan Progress */}
        <Link to="/treatment-tracker">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Treatment Progress</h2>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="text-center">
              <div className="relative inline-block">
                <svg className="w-32 h-32" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray={`${dashboardData.carePlanProgress.percentage}, 100`}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-gray-800">
                    {Math.round(dashboardData.carePlanProgress.percentage)}%
                  </span>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-gray-800">{dashboardData.carePlanProgress.completed}</div>
                  <div className="text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{dashboardData.carePlanProgress.inProgress}</div>
                  <div className="text-gray-600">In Progress</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{dashboardData.carePlanProgress.total}</div>
                  <div className="text-gray-600">Total</div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Upcoming Events & Medications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Events */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Upcoming Events</h2>
            <Calendar className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {dashboardData.upcomingAppointments.length > 0 ? (
              dashboardData.upcomingAppointments.map((appointment, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-800">{appointment.title}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {appointment.type}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No upcoming events scheduled</p>
            )}
          </div>
        </div>

        {/* Active Medications */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">Active Medications</h2>
            <Link 
              to="/medications" 
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Manage Schedule
            </Link>
          </div>
          <div className="space-y-3">
            {dashboardData.activeMedications.length > 0 ? (
              dashboardData.activeMedications.map((medication, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-gray-800">{medication.name}</h3>
                    <p className="text-sm text-gray-600">
                      {medication.dosage} • {medication.frequency}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    Active
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 mb-3">No active medications recorded</p>
                <Link 
                  to="/medications" 
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Medications
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
