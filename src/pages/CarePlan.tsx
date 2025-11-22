import React, { useState, useEffect } from 'react';
import { Plus, GripVertical, Calendar, Clock, MapPin, Info, CheckCircle, Trash2, Bell, BellOff } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { databaseService } from '../services/database';

interface Task {
  id: string;
  title: string;
  description: string;
  date?: string;
  time?: string;
  location?: string;
  category: 'treatment' | 'test' | 'medication' | 'lifestyle';
  status: 'upcoming' | 'in-progress' | 'completed' | 'monitoring';
  reminder?: string; // ISO string for reminder time
  notificationsEnabled?: boolean;
}

const CarePlan: React.FC = () => {
  const { user } = useApp();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTask, setNewTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    category: 'treatment',
    status: 'upcoming',
    notificationsEnabled: false,
  });
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadTasks(user.id);
    }
  }, [user]);

  // Check for due reminders
  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      tasks.forEach((task) => {
        if (task.reminder && task.notificationsEnabled && task.status !== 'completed') {
          const reminderTime = new Date(task.reminder);
          // Trigger if reminder time is now or within the last 30 seconds
          if (reminderTime <= now && reminderTime > new Date(now.getTime() - 30000)) {
            showNotification(task);
          }
        }
      });
    };

    // Run an immediate check on mount, then poll every 15s for better timing accuracy
    checkReminders();
    const interval = setInterval(checkReminders, 15000);
    return () => clearInterval(interval);
  }, [tasks]);

  const loadTasks = async (userId: string) => {
    try {
      const data = await databaseService.getCarePlanTasks(userId);
      setTasks(data);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const showNotification = (task: Task) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Care Plan Reminder: ${task.title}`, {
        body: task.description,
        icon: '/favicon.ico',
        tag: task.id,
      });
    }
    // Play an audible alert (Web Audio API) for emphasis
    try {
      playAlertSound();
    } catch (e) {
      // ignore audio errors
    }
    // Vibrate if available (mobile devices)
    try { if (navigator.vibrate) navigator.vibrate([300, 100, 300]); } catch (e) {}
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  };

  // Helper: convert an ISO string (UTC) into a local value suitable for `datetime-local` inputs
  const toLocalDatetimeInput = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    // shift to local time then format as ISO without timezone
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const localNowInputValue = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  // Play a short, loud alert tone using WebAudio. This may require a prior user gesture in some browsers.
  const playAlertSound = () => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880; // A5 tone
      g.gain.value = 0.001; // start very low to avoid a click
      o.connect(g);
      g.connect(ctx.destination);
      // ramp to audible volume quickly
      g.gain.setValueAtTime(0.001, ctx.currentTime);
      g.gain.linearRampToValueAtTime(1.0, ctx.currentTime + 0.01);
      o.start();
      // play for 700ms then fade out
      g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.7);
      setTimeout(() => {
        try { o.stop(); ctx.close(); } catch (e) {}
      }, 800);
    } catch (e) {
      // ignore if audio cannot be played
      console.warn('Audio alert failed', e);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task? This action cannot be undone.')) {
      return;
    }

    try {
      setDeleting(taskId);
      await databaseService.deleteCarePlanTask(taskId);
      setTasks((prev) => prev.filter((task) => task.id !== taskId));
      setSelectedTask(null);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task. Please try again.');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggleNotifications = async (taskId: string, enabled: boolean) => {
    try {
      await databaseService.updateCarePlanTask(taskId, { notificationsEnabled: enabled });
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, notificationsEnabled: enabled } : task
        )
      );
    } catch (error) {
      console.error('Error updating notifications:', error);
    }
  };

  const handleSetReminder = async (taskId: string, reminderTime: string) => {
    try {
      await databaseService.updateCarePlanTask(taskId, { reminder: reminderTime });
      // Also create a row in task_reminders to support server-side delivery if a worker exists
      if (typeof (databaseService as any).createTaskReminder === 'function') {
        try {
          await (databaseService as any).createTaskReminder(taskId, reminderTime);
        } catch (err) {
          console.warn('Failed to create task_reminder row:', err);
        }
      }

      // Ensure notification permission is requested so browser can show the reminder
      if ('Notification' in window && Notification.permission !== 'granted') {
        try { await requestNotificationPermission(); } catch (e) { /* ignore */ }
      }
      setTasks((prev) =>
        prev.map((task) =>
          task.id === taskId ? { ...task, reminder: reminderTime } : task
        )
      );
    } catch (error) {
      console.error('Error setting reminder:', error);
    }
  };

  const calculateReminderTime = (taskDate: string, taskTime?: string) => {
    const taskDateTime = new Date(taskDate);
    if (taskTime) {
      const [hours, minutes] = taskTime.split(':');
      taskDateTime.setHours(parseInt(hours), parseInt(minutes));
    }
    
    // Set reminder for 1 hour before the task
    const reminderTime = new Date(taskDateTime.getTime() - 60 * 60 * 1000);
    return reminderTime.toISOString();
  };

  const columns = [
    { id: 'upcoming', title: 'Upcoming', color: 'blue' },
    { id: 'in-progress', title: 'In Progress', color: 'yellow' },
    { id: 'completed', title: 'Completed', color: 'green' },
    { id: 'monitoring', title: 'Monitoring', color: 'purple' },
  ];

  // Pre-defined task templates for quick adding
  const taskTemplates = {
    chemotherapy: {
      title: 'Chemotherapy Session',
      description: 'Intravenous chemotherapy treatment as per protocol',
      category: 'treatment' as const,
      defaultDuration: '4 hours',
    },
    bloodWork: {
      title: 'Blood Work & Lab Tests',
      description: 'Complete blood count and metabolic panel to monitor treatment response',
      category: 'test' as const,
    },
    followUp: {
      title: 'Oncology Follow-up',
      description: 'Regular check-in with your oncologist to review progress',
      category: 'treatment' as const,
    },
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      setCreating(true);
      await databaseService.updateCarePlanTask(taskId, { status: 'completed' });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status: 'completed' } : task)));
      setSelectedTask(null);
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setCreating(false);
    }
  };

  const getCategoryColor = (category: Task['category']) => {
    switch (category) {
      case 'treatment':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'test':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'medication':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'lifestyle':
        return 'bg-orange-100 text-orange-700 border-orange-300';
    }
  };

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: Task['status']) => {
    if (draggedTask) {
      try {
        await databaseService.updateCarePlanTask(draggedTask.id, { status });
        setTasks((prev) =>
          prev.map((task) =>
            task.id === draggedTask.id ? { ...task, status } : task
          )
        );
      } catch (error) {
        console.error('Error updating task:', error);
      } finally {
        setDraggedTask(null);
      }
    }
  };

  const getTasksByStatus = (status: Task['status']) => {
    return tasks.filter((task) => task.status === status);
  };

  // Calculate progress metrics for the care plan
  const calculateCarePlanProgress = (tasksList: Task[]) => {
    const totalTasks = tasksList.length;
    const completedTasks = tasksList.filter((task) => task.status === 'completed').length;
    const inProgressTasks = tasksList.filter((task) => task.status === 'in-progress').length;

    return {
      completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      completedTasks,
      inProgressTasks,
      totalTasks,
    };
  };

  const formatReminderTime = (reminder: string) => {
    return new Date(reminder).toLocaleString();
  };

  return (
    <main className="container py-6" aria-labelledby="careplan-heading">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 id="careplan-heading" className="fluid-h1 font-bold text-gray-800">Personalized Care Plan</h1>
          <p className="body-text text-gray-600 mt-1">
            Your dynamic treatment journey — drag cards to update progress
          </p>
          {/* Progress summary */}
          <div className="mt-4">
            {(() => {
              const progress = calculateCarePlanProgress(tasks);
              const pct = Math.round(progress.completionRate);
              return (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">Progress</div>
                    <div className="text-sm font-medium text-gray-800">{pct}%</div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 flex space-x-4">
                    <span>Completed: {progress.completedTasks}</span>
                    <span>In progress: {progress.inProgressTasks}</span>
                    <span>Total: {progress.totalTasks}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingTask(null);
                  setNewTask({ 
                    title: '', 
                    description: '', 
                    category: 'treatment', 
                    status: 'upcoming',
                    notificationsEnabled: false 
                  });
              setShowAddModal(true);
            }}
            className="flex items-center px-4 py-2 btn-primary"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Task
          </button>
          <div className="ml-0 sm:ml-3 flex flex-wrap gap-2 items-center">
            {Object.values(taskTemplates).map((tpl, i) => (
              <button
                key={i}
                onClick={() => {
                  setEditingTask(null);
                  setNewTask({ 
                    title: tpl.title, 
                    description: tpl.description, 
                    category: tpl.category, 
                    status: 'upcoming',
                    notificationsEnabled: false 
                  });
                  setShowAddModal(true);
                }}
                title={`Quick add: ${tpl.title}`}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                {tpl.title}
              </button>
            ))}
            <button
              onClick={async () => {
                if (!user?.id) return alert('Please sign in to sync appointments');
                try {
                  setCreating(true);
                  const created = await databaseService.syncAppointmentsToTasks(user.id as string);
                  await loadTasks(user.id as string);
                  alert(created ? `Created ${created} task(s) from appointments` : 'No new tasks to create');
                } catch (err) {
                  console.error('Error syncing appointments:', err);
                  alert('Error syncing appointments. See console for details.');
                } finally {
                  setCreating(false);
                }
              }}
              title="Sync appointments"
              className="px-3 py-2 text-sm bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100"
            >
              Sync Appts
            </button>
          </div>
        </div>
      </header>

      <section aria-label="Guideline notice" className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-900 mb-1">Guideline-Based Care</h3>
            <p className="text-sm text-blue-800">
              Your care plan is aligned with NCCN guidelines for your specific diagnosis. Tasks are
              automatically generated from AI analysis of your medical records and treatment protocol.
            </p>
          </div>
        </div>
      </section>

      <section aria-label="Care plan board" className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {columns.map((column) => (
          <div key={column.id} className="bg-gray-50 rounded-xl p-3 md:p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-800 flex items-center text-sm md:text-base" role="heading" aria-level={2}>
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    column.color === 'blue'
                      ? 'bg-blue-500'
                      : column.color === 'yellow'
                      ? 'bg-yellow-500'
                      : column.color === 'green'
                      ? 'bg-green-500'
                      : 'bg-purple-500'
                  }`}
                ></div>
                {column.title}
              </h2>
              <span className="text-sm text-gray-600 bg-white px-2 py-1 rounded">
                {getTasksByStatus(column.id as Task['status']).length}
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id as Task['status'])}
              className="space-y-3 min-h-[160px]"
              role="list"
              aria-label={`${column.title} tasks`}
            >
              {getTasksByStatus(column.id as Task['status']).map((task) => (
                <article
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onClick={() => setSelectedTask(task)}
                  role="listitem"
                  tabIndex={0}
                  className="bg-white rounded-lg p-3 md:p-4 shadow-sm hover:shadow-md transition-all cursor-move border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  onKeyDown={(e) => { if (e.key === 'Enter') setSelectedTask(task); }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <GripVertical className="w-4 h-4 text-gray-400 mt-1" />
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          await handleToggleNotifications(task.id, !task.notificationsEnabled);
                        }}
                        className={`p-1 rounded ${
                          task.notificationsEnabled 
                            ? 'text-blue-500 hover:text-blue-700' 
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={task.notificationsEnabled ? 'Disable notifications' : 'Enable notifications'}
                      >
                        {task.notificationsEnabled ? <Bell className="w-3 h-3" /> : <BellOff className="w-3 h-3" />}
                      </button>
                      <span
                        className={`text-xs px-2 py-1 rounded-full border ${getCategoryColor(
                          task.category
                        )}`}
                      >
                        {task.category}
                      </span>
                    </div>
                  </div>

                  <h3 className="font-medium text-gray-800 mb-2 text-sm md:text-base">{task.title}</h3>
                  <p className="body-text text-gray-600 mb-3">{task.description}</p>

                  {task.date && (
                    <div className="space-y-1">
                      <div className="flex items-center text-xs text-gray-600">
                        <Calendar className="w-3 h-3 mr-2" />
                        {new Date(task.date).toLocaleDateString()}
                      </div>
                      {task.time && (
                        <div className="flex items-center text-xs text-gray-600">
                          <Clock className="w-3 h-3 mr-2" />
                          {task.time}
                        </div>
                      )}
                      {task.location && (
                        <div className="flex items-center text-xs text-gray-600">
                          <MapPin className="w-3 h-3 mr-2" />
                          {task.location}
                        </div>
                      )}
                      {task.reminder && task.notificationsEnabled && (
                        <div className="flex items-center text-xs text-blue-600">
                          <Bell className="w-3 h-3 mr-2" />
                          Reminder: {formatReminderTime(task.reminder)}
                        </div>
                      )}
                    </div>
                  )}

                  {task.status === 'completed' && (
                    <div className="mt-3 flex items-center text-green-600 text-sm">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Completed
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
      </section>

      {selectedTask && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="card max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <span
                  className={`inline-block text-xs px-3 py-1 rounded-full border mb-3 ${getCategoryColor(
                    selectedTask.category
                  )}`}
                >
                  {selectedTask.category}
                </span>
                <h2 className="text-2xl font-bold text-gray-800">{selectedTask.title}</h2>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-600">{selectedTask.description}</p>
              </div>

              {selectedTask.date && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Date</h3>
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      {new Date(selectedTask.date).toLocaleDateString()}
                    </div>
                  </div>
                  {selectedTask.time && (
                    <div>
                      <h3 className="font-semibold text-gray-700 mb-2">Time</h3>
                      <div className="flex items-center text-gray-600">
                        <Clock className="w-4 h-4 mr-2" />
                        {selectedTask.time}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedTask.location && (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Location</h3>
                  <div className="flex items-center text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {selectedTask.location}
                  </div>
                </div>
              )}

              {/* Reminder Settings */}
              {selectedTask.date && selectedTask.status !== 'completed' && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">Reminder Settings</h3>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Enable Notifications</span>
                    <button
                      onClick={async () => {
                        const newState = !selectedTask.notificationsEnabled;
                        await handleToggleNotifications(selectedTask.id, newState);
                        if (newState) {
                          await requestNotificationPermission();
                        }
                      }}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                        selectedTask.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                          selectedTask.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {selectedTask.notificationsEnabled && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Set Reminder
                      </label>
                      <input
                        type="datetime-local"
                        value={toLocalDatetimeInput(selectedTask.reminder)}
                        onChange={(e) => {
                          if (e.target.value) {
                            // e.target.value is a local datetime string; construct a Date and store as ISO (UTC)
                            const reminderTime = new Date(e.target.value).toISOString();
                            handleSetReminder(selectedTask.id, reminderTime);
                          }
                        }}
                        className="input-field w-full"
                        min={localNowInputValue()}
                      />
                      <button
                        onClick={() => {
                          if (selectedTask.date) {
                            const reminderTime = calculateReminderTime(selectedTask.date, selectedTask.time);
                            handleSetReminder(selectedTask.id, reminderTime);
                          }
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        Set 1 hour before task
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h3 className="font-semibold text-blue-900 mb-2">Clinical Purpose</h3>
                <p className="text-sm text-blue-800">
                  {selectedTask.category === 'treatment' &&
                    'This treatment is part of your personalized protocol designed to target cancer cells while minimizing side effects.'}
                  {selectedTask.category === 'test' &&
                    'This test helps monitor your response to treatment and guides ongoing care decisions.'}
                  {selectedTask.category === 'medication' &&
                    'This medication helps manage symptoms and improve your quality of life during treatment.'}
                  {selectedTask.category === 'lifestyle' &&
                    'Maintaining physical activity can improve treatment outcomes and overall well-being.'}
                </p>
              </div>

              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => selectedTask && handleCompleteTask(selectedTask.id)}
                  disabled={creating}
                  className="flex-1 px-4 py-3 btn-primary"
                >
                  {creating ? 'Completing…' : 'Mark as Complete'}
                </button>
                <button
                  onClick={() => {
                    setEditingTask(selectedTask);
                    setSelectedTask(null);
                    setNewTask({
                      title: selectedTask?.title,
                      description: selectedTask?.description,
                      category: selectedTask?.category,
                      status: selectedTask?.status,
                      date: selectedTask?.date,
                      time: selectedTask?.time,
                      location: selectedTask?.location,
                      notificationsEnabled: selectedTask?.notificationsEnabled,
                      reminder: selectedTask?.reminder,
                    });
                    setShowAddModal(true);
                  }}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteTask(selectedTask.id)}
                  disabled={deleting === selectedTask.id}
                  className="px-4 py-3 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-all"
                >
                  {deleting === selectedTask.id ? 'Deleting…' : <Trash2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => !creating && setShowAddModal(false)}
        >
          <div
            className="card modal-card max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                {editingTask ? 'Edit Task' : 'Add Care Plan Task'}
              </h2>
              <button
                onClick={() => !creating && setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <input
                  value={newTask.title}
                  onChange={(e) => setNewTask((t) => ({ ...t, title: e.target.value }))}
                  className="input-field mt-1 w-full"
                  placeholder="e.g. Chemotherapy Cycle 4"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask((t) => ({ ...t, description: e.target.value }))}
                  className="input-field mt-1 w-full"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    value={newTask.category}
                    onChange={(e) => setNewTask((t) => ({ ...t, category: e.target.value as Task['category'] }))}
                    className="input-field mt-1 w-full"
                  >
                    <option value="treatment">Treatment</option>
                    <option value="test">Test</option>
                    <option value="medication">Medication</option>
                    <option value="lifestyle">Lifestyle</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={newTask.status}
                    onChange={(e) => setNewTask((t) => ({ ...t, status: e.target.value as Task['status'] }))}
                    className="input-field mt-1 w-full"
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="monitoring">Monitoring</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <input
                    type="date"
                    value={newTask.date || ''}
                    onChange={(e) => setNewTask((t) => ({ ...t, date: e.target.value }))}
                    className="input-field mt-1 w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Time</label>
                  <input
                    type="time"
                    value={newTask.time || ''}
                    onChange={(e) => setNewTask((t) => ({ ...t, time: e.target.value }))}
                    className="input-field mt-1 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Location (optional)</label>
                <input
                  value={newTask.location || ''}
                  onChange={(e) => setNewTask((t) => ({ ...t, location: e.target.value }))}
                  className="input-field mt-1 w-full"
                />
              </div>

              {/* Reminder Settings in Add Modal */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    Enable Notifications
                  </label>
                  <button
                    onClick={() => setNewTask((t) => ({ ...t, notificationsEnabled: !t.notificationsEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${
                      newTask.notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
                        newTask.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {newTask.notificationsEnabled && newTask.date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Set Reminder
                    </label>
                    <input
                      type="datetime-local"
                      value={toLocalDatetimeInput(newTask.reminder)}
                      onChange={(e) => {
                        if (e.target.value) {
                          const reminderTime = new Date(e.target.value).toISOString();
                          setNewTask((t) => ({ ...t, reminder: reminderTime }));
                        } else {
                          setNewTask((t) => ({ ...t, reminder: undefined }));
                        }
                      }}
                      className="input-field w-full"
                      min={localNowInputValue()}
                    />
                    {newTask.date && (
                      <button
                        onClick={() => {
                          if (newTask.date) {
                            const reminderTime = calculateReminderTime(newTask.date, newTask.time);
                            setNewTask((t) => ({ ...t, reminder: reminderTime }));
                          }
                        }}
                        className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                      >
                        Set 1 hour before task
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTask(null);
                    setNewTask({ title: '', description: '', category: 'treatment', status: 'upcoming', notificationsEnabled: false });
                  }}
                  disabled={creating}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!user?.id) return;
                    if (!newTask.title || !newTask.description) return alert('Please add a title and description');
                    
                    // Request notification permission if enabling notifications
                    if (newTask.notificationsEnabled) {
                      await requestNotificationPermission();
                    }

                    try {
                      setCreating(true);
                      const userId = user.id as string;
                      if (editingTask) {
                        // update existing task
                        const updates = {
                          title: newTask.title as string,
                          description: newTask.description as string,
                          category: (newTask.category as string) || 'treatment',
                          status: (newTask.status as string) || 'upcoming',
                          date: newTask.date,
                          time: newTask.time,
                          location: newTask.location,
                          notificationsEnabled: newTask.notificationsEnabled,
                          reminder: newTask.reminder,
                        };
                        const updated = await databaseService.updateCarePlanTask(editingTask.id, updates);
                        setTasks((prev) => prev.map((t) => (t.id === editingTask.id ? (updated as Task) : t)));
                        setEditingTask(null);
                      } else {
                        // create new task
                        const created = await databaseService.createCarePlanTask(userId, {
                          title: newTask.title as string,
                          description: newTask.description as string,
                          category: (newTask.category as string) || 'treatment',
                          status: (newTask.status as string) || 'upcoming',
                          date: newTask.date,
                          time: newTask.time,
                          location: newTask.location,
                          notificationsEnabled: newTask.notificationsEnabled,
                          reminder: newTask.reminder,
                        });
                        // Prepend new task to local state
                        setTasks((prev) => [created as Task, ...(prev || [])]);
                      }
                      setShowAddModal(false);
                      setNewTask({ title: '', description: '', category: 'treatment', status: 'upcoming', notificationsEnabled: false });
                    } catch (err: any) {
                      console.error('Error creating/updating task:', err);
                      const message = err?.message || (typeof err === 'string' ? err : JSON.stringify(err));
                      alert(`Could not save task: ${message}`);
                    } finally {
                      setCreating(false);
                    }
                  }}
                  className="px-4 py-2 btn-primary"
                >
                  {creating ? (editingTask ? 'Saving…' : 'Creating…') : (editingTask ? 'Save Changes' : 'Create Task')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default CarePlan;