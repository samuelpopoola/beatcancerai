import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { databaseService } from '../services/database';

interface CarePlanProgress {
  completed: number;
  inProgress: number;
  total: number;
  percentage: number;
}

const TreatmentTracker: React.FC = () => {
  const { user } = useApp();
  const [progress, setProgress] = useState<CarePlanProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      try {
        const tasks = await databaseService.getCarePlanTasks(user.id);
        const completed = tasks.filter((t: any) => t.status === 'completed').length;
        const inProgress = tasks.filter((t: any) => t.status === 'in-progress').length;
        const total = tasks.length;
        const percentage = total > 0 ? (completed / total) * 100 : 0;
        setProgress({ completed, inProgress, total, percentage });
      } catch (e: any) {
        setError('Failed to load treatment progress');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Treatment Tracker</h1>
        <p className="text-gray-600 mt-1">Real-time overview of your care plan completion.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Progress Summary</h2>
          {loading && <p className="text-gray-500">Loading...</p>}
          {error && <p className="text-red-600 text-sm">{error}</p>}
          {progress && !loading && !error && (
            <div className="text-center">
              <div className="relative inline-block mb-4">
                <svg className="w-40 h-40" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="3"
                    strokeDasharray={`${progress.percentage}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-bold text-gray-800">{Math.round(progress.percentage)}%</span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="font-semibold text-gray-800">{progress.completed}</div>
                  <div className="text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{progress.inProgress}</div>
                  <div className="text-gray-600">In Progress</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-800">{progress.total}</div>
                  <div className="text-gray-600">Total Tasks</div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Next Steps</h2>
          {progress && progress.total === 0 && (
            <p className="text-gray-500">No care plan tasks yet. Start by adding tasks in the Care Plan page.</p>
          )}
          {progress && progress.total > 0 && (
            <ul className="space-y-3 text-sm text-gray-700">
              <li>Maintain momentum by completing in-progress tasks.</li>
              <li>Review upcoming appointments to prepare necessary documents.</li>
              <li>Log symptoms regularly to refine recommendations.</li>
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default TreatmentTracker;
