import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { databaseService } from '../services/database';
import { Calendar, Pill, TrendingUp, AlertCircle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Appointment {
  id?: string;
  title: string;
  date: string;
  time?: string;
  type?: string;
  location?: string;
}

interface Medication {
  id?: string;
  name: string;
  dosage?: string;
  frequency?: string;
  active?: boolean;
}

const Dashboard: React.FC = () => {
  const { userProfile, user } = useApp();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);

  useEffect(() => {
    if (user && user.id) {
      loadDashboardData(user.id);
    }
  }, [user]);

  const loadDashboardData = async (userId: string) => {
    try {
      const [appointmentsData, medicationsData, tasksData] = await Promise.all([
        databaseService.getAppointments(userId),
        databaseService.getMedications(userId),
        databaseService.getCarePlanTasks(userId),
      ]);
      setAppointments(appointmentsData.slice(0, 3));
      setMedications(medicationsData);
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const upcomingEvents = appointments.map((apt, idx) => ({
    id: idx + 1,
    title: apt.title,
    date: new Date(apt.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }),
    time: apt.time,
    type: apt.type,
    location: apt.location || 'TBD',
  }));

  const timelineEntries = (() => {
    if (!tasks.length) return [];
    const sorted = [...tasks].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      return da - db;
    });
    return sorted.slice(0, 6).map((t: any, i: number) => ({
      id: t.id || i,
      title: t.title,
      status: t.status,
      when: t.date ? new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'No date',
      description: t.description || '',
    }));
  })();

  const getTimelineVisuals = (status: string) => {
    if (status === 'completed') {
      return { border: 'border-emerald-500', dot: 'bg-emerald-500', line: 'bg-emerald-200 dark:bg-emerald-900/40' };
    }
    if (status === 'in-progress') {
      return { border: 'border-blue-500', dot: 'bg-blue-500', line: 'bg-blue-200 dark:bg-blue-900/40' };
    }
    return { border: 'border-gray-400', dot: 'bg-gray-400', line: 'bg-gray-200 dark:bg-gray-600' };
  };

  const upcomingRef = useRef<HTMLDivElement | null>(null);
  const medicationsRef = useRef<HTMLDivElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<typeof upcomingEvents[0] | null>(null);

  const aiInsights = [
    {
      title: 'Treatment Progress',
      message: 'Your recent lab results show positive response to current treatment protocol.',
      type: 'success',
    },
    {
      title: 'Upcoming Screening',
      message: 'Based on NCCN guidelines, a follow-up CT scan is recommended within 2 weeks.',
      type: 'info',
    },
    {
      title: 'Symptom Tracking',
      message: 'Consider logging your daily symptoms to help identify patterns.',
      type: 'reminder',
    },
  ];

  const getDaysFromDiagnosis = () => {
    if (!userProfile?.diagnosis_date) return 0;
    const diagnosis = new Date(userProfile.diagnosis_date);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - diagnosis.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">
          Welcome back, {userProfile?.first_name ? `${userProfile.first_name}${userProfile.last_name ? ' ' + userProfile.last_name : ''}` : (userProfile?.gender === 'Male' ? 'Sir' : userProfile?.gender === 'Female' ? 'Ma\'am' : 'Friend')}
        </h1>
        <p className="text-gray-600 mt-1">Here's your personalized care overview for today</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div
          role="button"
          tabIndex={0}
          onClick={() => upcomingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onKeyDown={(e) => e.key === 'Enter' && upcomingRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <Calendar className="w-8 h-8" />
            <span className="text-blue-100 text-sm">Upcoming</span>
          </div>
          <div className="text-3xl font-bold mb-1">{upcomingEvents.length}</div>
          <div className="text-blue-100">Scheduled Events</div>
        </div>

        <div
          role="button"
          tabIndex={0}
          onClick={() => medicationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onKeyDown={(e) => e.key === 'Enter' && medicationsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg cursor-pointer"
        >
          <div className="flex items-center justify-between mb-4">
            <Pill className="w-8 h-8" />
            <span className="text-green-100 text-sm">Active</span>
          </div>
          <div className="text-3xl font-bold mb-1">
            {medications.filter((m) => m.active).length || 0}
          </div>
          <div className="text-green-100">Active Medications</div>
        </div>

        <Link to="/treatment-tracker" className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg cursor-pointer hover:shadow-xl transition-shadow block">
          <div className="flex items-center justify-between mb-4">
            <TrendingUp className="w-8 h-8" />
            <span className="text-purple-100 text-sm">Tracker</span>
          </div>
          <div className="text-3xl font-bold mb-1">{getDaysFromDiagnosis()}</div>
          <div className="text-purple-100">Days Since Diagnosis</div>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Upcoming Events</h2>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                View All
              </button>
            </div>
            <div className="space-y-4">
              {upcomingEvents.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No upcoming events scheduled</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div
                      className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${
                        event.type === 'treatment'
                          ? 'bg-blue-100 text-blue-600'
                          : event.type === 'lab'
                          ? 'bg-green-100 text-green-600'
                          : 'bg-purple-100 text-purple-600'
                      }`}
                    >
                      {event.type === 'treatment' && <Activity className="w-6 h-6" />}
                      {event.type === 'lab' && <TrendingUp className="w-6 h-6" />}
                      {event.type === 'appointment' && <Calendar className="w-6 h-6" />}
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{event.title}</h3>
                      <p className="text-sm text-gray-600 flex items-center mb-1">
                        <Calendar className="w-4 h-4 mr-2" />
                        {event.date} at {event.time}
                      </p>
                      <p className="text-sm text-gray-500">{event.location}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Treatment Timeline</h2>
              <span className="text-sm text-gray-500">{timelineEntries.length} milestone{timelineEntries.length === 1 ? '' : 's'}</span>
            </div>
            <div className="relative pl-10 sm:pl-12">
              <div className="absolute left-5 top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-700" />
              <div className="space-y-6">
                {timelineEntries.length === 0 && (
                  <p className="text-gray-500 text-sm">No care plan tasks yet. Add tasks to build your timeline.</p>
                )}
                {timelineEntries.map((entry) => {
                  const visuals = getTimelineVisuals(entry.status);
                  return (
                    <div key={entry.id} className="relative pl-10">
                      <div className="absolute left-5 top-2 -translate-x-1/2">
                        <div className={`w-7 h-7 rounded-full border-2 ${visuals.border} bg-white flex items-center justify-center`}>
                          <span className={`w-2.5 h-2.5 rounded-full ${visuals.dot}`}></span>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">
                        <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{entry.when}</p>
                        <h3 className="text-base font-semibold text-gray-800 dark:text-gray-100">{entry.title}</h3>
                        {entry.description && <p className="mt-1">{entry.description}</p>}
                        <p className="text-xs mt-1 capitalize text-gray-500 dark:text-gray-400">Status: {entry.status.replace('-', ' ')}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card">
            <h2 className="text-xl font-bold text-gray-800 mb-6">AI Insights</h2>
            <div className="space-y-4">
              {aiInsights.map((insight, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border-l-4 ${
                    insight.type === 'success'
                      ? 'bg-green-50 border-green-500'
                      : insight.type === 'info'
                      ? 'bg-blue-50 border-blue-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-start">
                    <AlertCircle
                      className={`w-5 h-5 mr-3 mt-0.5 ${
                        insight.type === 'success'
                          ? 'text-green-600'
                          : insight.type === 'info'
                          ? 'text-blue-600'
                          : 'text-yellow-600'
                      }`}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-800 mb-1">{insight.title}</h3>
                      <p className="text-sm text-gray-600">{insight.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600">
                <strong>Disclaimer:</strong> AI-generated insights are for informational purposes only.
                Always consult your healthcare provider.
              </p>
            </div>
            {/* Gemini AI test removed from dashboard */}
          </div>

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
              {medications.filter(m => m.active).length > 0 ? (
                medications.filter(m => m.active).map((med, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h3 className="font-semibold text-gray-800">{med.name}</h3>
                      <p className="text-sm text-gray-600">{med.dosage} • {med.frequency}</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">Active</span>
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
      {selectedEvent && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedEvent(null)}
        >
          <div className="card modal-card max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">{selectedEvent.title}</h2>
                <p className="text-sm text-gray-600">{selectedEvent.date} {selectedEvent.time ? `• ${selectedEvent.time}` : ''}</p>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="text-gray-400 hover:text-gray-600">×</button>
            </div>
            <div>
              <p className="text-sm text-gray-700 mb-2">Type: <strong className="capitalize">{selectedEvent.type || 'appointment'}</strong></p>
              <p className="text-sm text-gray-700">Location: {selectedEvent.location}</p>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => setSelectedEvent(null)} className="px-4 py-2 btn-primary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
