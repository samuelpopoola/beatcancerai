import React, { useState, useEffect, FormEvent } from 'react';
import { Clock, Bell, Loader2, Pencil, Trash2, Plus, Minus, CheckCircle2, AlertCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { databaseService } from '../services/database';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  reminderTimes: string[];
  notes?: string;
  reminderEnabled: boolean;
  active: boolean;
}

interface FormState {
  name: string;
  dosage: string;
  frequency: string;
  reminderTimes: string[];
  notes: string;
  reminderEnabled: boolean;
  active: boolean;
}

type Feedback = { type: 'success' | 'error'; text: string } | null;

const createEmptyFormState = (): FormState => ({
  name: '',
  dosage: '',
  frequency: 'daily',
  reminderTimes: ['09:00'],
  notes: '',
  reminderEnabled: true,
  active: true,
});

const MedicationScheduler: React.FC = () => {
  const { user, userProfile } = useApp();
  const userId = userProfile?.id || user?.id || null;
  const [medications, setMedications] = useState<Medication[]>([]);
  const [formState, setFormState] = useState<FormState>(createEmptyFormState());
  const [editingMedicationId, setEditingMedicationId] = useState<string | null>(null);
  const [formFeedback, setFormFeedback] = useState<Feedback>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [actionState, setActionState] = useState<{ id: string | null; type: 'reminder' | 'active' | 'delete' | null }>({ id: null, type: null });
  const [supportsMedicationReminders, setSupportsMedicationReminders] = useState(true);

  useEffect(() => {
    if (userId) {
      loadMedications();
    } else {
      setMedications([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    const detectReminderSupport = async () => {
      if (typeof databaseService.supportsMedicationReminders !== 'function') {
        return;
      }
      try {
        const supported = await databaseService.supportsMedicationReminders();
        if (!cancelled) {
          setSupportsMedicationReminders(supported);
        }
      } catch (error) {
        console.debug('Unable to verify medication reminder columns; disabling reminder UI.', error);
        if (!cancelled) {
          setSupportsMedicationReminders(false);
        }
      }
    };
    detectReminderSupport();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadMedications = async () => {
    if (!userId) {
      setFormFeedback({ type: 'error', text: 'Please complete onboarding before adding medications.' });
      return;
    }
    setListLoading(true);
    try {
      const userMeds = await databaseService.getMedications(userId);
      setMedications(userMeds);
    } catch (error) {
      console.error('Error loading medications:', error);
      setFormFeedback({ type: 'error', text: 'Unable to load medications. Please try again.' });
    } finally {
      setListLoading(false);
    }
  };

  const resetForm = () => {
    setFormState(createEmptyFormState());
    setEditingMedicationId(null);
  };

  const handleReminderTimeChange = (index: number, value: string) => {
    setFormState((prev) => {
      const updated = [...prev.reminderTimes];
      updated[index] = value;
      return { ...prev, reminderTimes: updated };
    });
  };

  const addReminderTime = () => {
    setFormState((prev) => ({
      ...prev,
      reminderTimes: [...prev.reminderTimes, '12:00'],
    }));
  };

  const removeReminderTime = (index: number) => {
    setFormState((prev) => {
      if (prev.reminderTimes.length === 1) {
        return prev;
      }
      const updated = prev.reminderTimes.filter((_, i) => i !== index);
      return { ...prev, reminderTimes: updated.length ? updated : ['09:00'] };
    });
  };

  const isReminderSchemaError = (error: unknown) => {
    const err = error as { code?: string; message?: string };
    if (err?.code !== 'PGRST204') return false;
    return typeof err.message === 'string' && /reminder_(enabled|times)/i.test(err.message);
  };

  const buildPayload = (includeReminders: boolean) => {
    const basePayload = {
      name: formState.name.trim(),
      dosage: formState.dosage.trim(),
      frequency: formState.frequency,
      notes: formState.notes.trim() || undefined,
      active: formState.active,
    };
    if (!includeReminders) {
      return basePayload;
    }
    return {
      ...basePayload,
      reminderEnabled: formState.reminderEnabled,
      reminderTimes: formState.reminderTimes,
    };
  };

  const persistMedication = async (includeReminders: boolean): Promise<void> => {
    if (!userId) {
      throw new Error('User ID missing; cannot save medication.');
    }

    const payload = buildPayload(includeReminders);
    try {
      if (editingMedicationId) {
        await databaseService.updateMedication(editingMedicationId, payload);
      } else {
        await databaseService.addMedication(userId, payload);
      }
    } catch (error) {
      if (includeReminders && isReminderSchemaError(error)) {
        setSupportsMedicationReminders(false);
        await persistMedication(false);
        return;
      }
      throw error;
    }
  };

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!userId) {
      setFormFeedback({ type: 'error', text: 'Please complete onboarding before adding medications.' });
      return;
    }

    if (!formState.name.trim()) {
      setFormFeedback({ type: 'error', text: 'Medication name is required.' });
      return;
    }
    if (!formState.dosage.trim()) {
      setFormFeedback({ type: 'error', text: 'Dosage information is required.' });
      return;
    }
    if (supportsMedicationReminders && formState.reminderTimes.some((time) => !time)) {
      setFormFeedback({ type: 'error', text: 'Please fill in all reminder times or remove empty entries.' });
      return;
    }

    setIsSubmitting(true);
    setFormFeedback(null);

    try {
      await persistMedication(supportsMedicationReminders);
      setFormFeedback({
        type: 'success',
        text: editingMedicationId ? 'Medication updated successfully.' : 'Medication added to your schedule.',
      });
      resetForm();
      await loadMedications();
    } catch (error) {
      const err = error as { message?: string; details?: string; hint?: string };
      const details = err?.message || err?.details || err?.hint || 'Unable to save medication. Please try again.';
      console.error('Error saving medication:', err);
      setFormFeedback({ type: 'error', text: details });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditMedication = (medication: Medication) => {
    setEditingMedicationId(medication.id);
    setFormFeedback(null);
    setFormState({
      name: medication.name || '',
      dosage: medication.dosage || '',
      frequency: medication.frequency || 'daily',
      reminderTimes: medication.reminderTimes?.length ? medication.reminderTimes : ['09:00'],
      notes: medication.notes || '',
      reminderEnabled: medication.reminderEnabled,
      active: medication.active,
    });
  };

  const handleDeleteMedication = async (medicationId: string) => {
    if (!userId) {
      setFormFeedback({ type: 'error', text: 'You must finish onboarding before deleting medications.' });
      return;
    }
    const confirmed = window.confirm('Delete this medication? This action cannot be undone.');
    if (!confirmed) return;

    setActionState({ id: medicationId, type: 'delete' });
    try {
      await databaseService.deleteMedication(medicationId);
      setFormFeedback({ type: 'success', text: 'Medication removed.' });
      if (editingMedicationId === medicationId) {
        resetForm();
      }
      await loadMedications();
    } catch (error) {
      const err = error as { message?: string; details?: string };
      console.error('Error deleting medication:', err);
      setFormFeedback({ type: 'error', text: err?.message || err?.details || 'Unable to delete medication right now.' });
    } finally {
      setActionState({ id: null, type: null });
    }
  };

  const handleToggleActive = async (medication: Medication) => {
    setActionState({ id: medication.id, type: 'active' });
    try {
      await databaseService.updateMedication(medication.id, { active: !medication.active });
      setFormFeedback({
        type: 'success',
        text: `${medication.name} ${medication.active ? 'paused' : 'reactivated'}.`,
      });
      await loadMedications();
    } catch (error) {
      const err = error as { message?: string; details?: string };
      console.error('Error updating medication status:', err);
      setFormFeedback({ type: 'error', text: err?.message || err?.details || 'Unable to update medication status.' });
    } finally {
      setActionState({ id: null, type: null });
    }
  };

  const handleToggleReminder = async (medication: Medication) => {
    if (!supportsMedicationReminders) {
      setFormFeedback({
        type: 'error',
        text: 'Medication reminders are disabled because the database is missing reminder columns.',
      });
      return;
    }
    setActionState({ id: medication.id, type: 'reminder' });
    try {
      await databaseService.updateMedicationReminder(medication.id, !medication.reminderEnabled);
      setFormFeedback({
        type: 'success',
        text: `Reminders ${medication.reminderEnabled ? 'disabled' : 'enabled'} for ${medication.name}.`,
      });
      await loadMedications();
    } catch (error) {
      const err = error as { message?: string; details?: string };
      console.error('Error updating reminder:', err);
      setFormFeedback({ type: 'error', text: err?.message || err?.details || 'Unable to update reminders right now.' });
    } finally {
      setActionState({ id: null, type: null });
    }
  };

  const isProcessing = (id: string, type: 'reminder' | 'active' | 'delete') =>
    actionState.id === id && actionState.type === type;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">My Medications</h1>
        <p className="text-gray-600 mt-1">Add, edit, or pause medications anytime.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
                {editingMedicationId ? 'Update Medication' : 'Add a New Medication'}
              </h2>
              <p className="text-sm text-gray-500">
                {editingMedicationId ? 'Editing an existing medication entry.' : 'Capture dosage, reminders, and notes.'}
              </p>
            </div>
            {editingMedicationId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-sm font-medium text-blue-600 hover:text-blue-800"
              >
                Cancel
              </button>
            )}
          </div>

          {formFeedback && (
            <div
              className={`mb-4 flex items-start gap-3 rounded-lg border px-3 py-2 text-sm ${
                formFeedback.type === 'success'
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {formFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 mt-0.5" />
              )}
              <div className="flex-1">{formFeedback.text}</div>
              <button
                type="button"
                className="text-xs font-semibold text-gray-500"
                onClick={() => setFormFeedback(null)}
              >
                Dismiss
              </button>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medication Name</label>
              <input
                type="text"
                placeholder="e.g., Anastrozole"
                value={formState.name}
                onChange={(e) => setFormState((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dosage</label>
              <input
                type="text"
                placeholder="e.g., 50mg"
                value={formState.dosage}
                onChange={(e) => setFormState((prev) => ({ ...prev, dosage: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={formState.frequency}
                onChange={(e) => setFormState((prev) => ({ ...prev, frequency: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="twice-daily">Twice Daily</option>
                <option value="weekly">Weekly</option>
                <option value="as-needed">As Needed</option>
              </select>
            </div>

            {supportsMedicationReminders ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reminder Time(s)</label>
                  <div className="space-y-2">
                    {formState.reminderTimes.map((time, index) => (
                      <div key={`${time}-${index}`} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={time}
                          onChange={(e) => handleReminderTimeChange(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {formState.reminderTimes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeReminderTime(index)}
                            className="inline-flex items-center justify-center rounded-full border border-gray-200 p-1 text-gray-500 hover:text-red-500"
                            aria-label="Remove reminder time"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addReminderTime}
                      className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800"
                    >
                      <Plus className="w-4 h-4 mr-1" />Add another time
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={formState.reminderEnabled}
                      onChange={(e) => setFormState((prev) => ({ ...prev, reminderEnabled: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Enable reminders
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      checked={formState.active}
                      onChange={(e) => setFormState((prev) => ({ ...prev, active: e.target.checked }))}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    Mark as active
                  </label>
                </div>
              </>
            ) : (
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={formState.active}
                  onChange={(e) => setFormState((prev) => ({ ...prev, active: e.target.checked }))}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                Mark as active
              </label>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
              <textarea
                placeholder="e.g., Take with food"
                value={formState.notes}
                onChange={(e) => setFormState((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full inline-flex items-center justify-center bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingMedicationId ? 'Save Changes' : 'Add Medication'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Medication Schedule</h2>
          <div className="space-y-4">
            {listLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                <Loader2 className="w-6 h-6 animate-spin mb-2" />
                Loading medications...
              </div>
            ) : medications.length ? (
              medications.map((medication) => (
                <div key={medication.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="font-bold text-gray-800">{medication.name}</h3>
                      <p className="text-sm text-gray-600">
                        {medication.dosage}, {medication.frequency}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(medication)}
                        disabled={isProcessing(medication.id, 'active')}
                        className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${
                          medication.active
                            ? 'bg-green-50 border-green-200 text-green-700'
                            : 'bg-gray-50 border-gray-200 text-gray-600'
                        }`}
                      >
                        {isProcessing(medication.id, 'active') && (
                          <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        )}
                        {medication.active ? 'Active' : 'Paused'}
                      </button>
                      {supportsMedicationReminders && (
                        <button
                          type="button"
                          onClick={() => handleToggleReminder(medication)}
                          disabled={isProcessing(medication.id, 'reminder')}
                          className={`inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full border ${
                            medication.reminderEnabled
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600'
                          }`}
                        >
                          {isProcessing(medication.id, 'reminder') && (
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                          )}
                          {medication.reminderEnabled ? 'Reminders on' : 'Reminders off'}
                        </button>
                      )}
                    </div>
                  </div>

                  {supportsMedicationReminders && medication.reminderTimes.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {medication.reminderTimes.map((time, index) => (
                        <div
                          key={`${medication.id}-time-${index}`}
                          className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                        >
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {time}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <Bell className="w-4 h-4" />
                            {medication.reminderEnabled ? 'Reminder scheduled' : 'Reminder disabled'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {medication.notes && (
                    <p className="mt-3 text-sm text-gray-600 border-t border-dashed border-gray-200 pt-3">
                      Note: {medication.notes}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    <button
                      type="button"
                      onClick={() => handleEditMedication(medication)}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:text-blue-600"
                    >
                      <Pencil className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedication(medication.id)}
                      disabled={isProcessing(medication.id, 'delete')}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 disabled:opacity-60"
                    >
                      {isProcessing(medication.id, 'delete') ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p className="font-medium">No medications scheduled</p>
                <p className="text-sm">Add your first medication to get started.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicationScheduler;