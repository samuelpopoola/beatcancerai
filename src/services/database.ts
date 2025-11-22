import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const MEDICAL_RECORDS_BUCKET = import.meta.env.VITE_SUPABASE_MEDICAL_BUCKET || 'medical-records';

export const databaseService = {
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createUserProfile(userId: string, profile: Omit<UserProfile, 'id'>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        id: userId,
        ...profile,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateUserProfile(userId: string, profile: Partial<UserProfile>) {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...profile,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getMedicalRecords(userId: string) {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('user_id', userId)
      .order('upload_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Fetch a single medical record by id
  async getMedicalRecord(recordId: string) {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('id', recordId)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async createMedicalRecord(userId: string, record: {
    name: string;
    file_type: string;
    category: string;
    file_url?: string;
  }) {
    const { data, error } = await supabase
      .from('medical_records')
      .insert({
        user_id: userId,
        ...record,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Upload a medical record file to Supabase Storage and return a public URL.
   * Expects a bucket named `medical-records` (or `VITE_SUPABASE_MEDICAL_BUCKET`) to exist in Supabase.
   */
  async uploadMedicalRecord(file: File, userId: string) {
    try {
      const bucket = MEDICAL_RECORDS_BUCKET;
      const fileName = `${userId}/${Date.now()}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, { upsert: false });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('uploadMedicalRecord error:', err);
      throw err;
    }
  },

  async updateMedicalRecord(recordId: string, updates: {
    analyzed?: boolean;
    analysis_data?: Record<string, unknown> | null;
    category?: string;
  }) {
    const { data, error } = await supabase
      .from('medical_records')
      .update(updates)
      .eq('id', recordId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMedicalRecord(recordId: string) {
    const { error } = await supabase
      .from('medical_records')
      .delete()
      .eq('id', recordId);

    if (error) throw error;
  },

  async getCarePlanTasks(userId: string) {
    const { data, error } = await supabase
      .from('care_plan_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Return recent tasks (most recently created)
  async getRecentTasks(userId: string, limit = 10) {
    const { data, error } = await supabase
      .from('care_plan_tasks')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async createCarePlanTask(userId: string, task: {
    title: string;
    description: string;
    category: string;
    status: string;
    priority?: string;
    date?: string;
    time?: string;
    location?: string;
    notificationsEnabled?: boolean;
    reminder?: string;
  }) {
    // Map camelCase client fields to snake_case DB columns
    const dbTask: any = { ...task };
    if (typeof (task as any).notificationsEnabled !== 'undefined') {
      dbTask.notifications_enabled = (task as any).notificationsEnabled;
      delete dbTask.notificationsEnabled;
    }

    // 'reminder' is already lower-case; keep it as-is

    const { data, error } = await supabase
      .from('care_plan_tasks')
      .insert({
        user_id: userId,
        ...dbTask,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCarePlanTask(taskId: string, updates: {
    title?: string;
    description?: string;
    category?: string;
    status?: string;
    date?: string;
    time?: string;
    location?: string;
    order_index?: number;
    priority?: string;
    notificationsEnabled?: boolean;
    reminder?: string;
  }) {
    // Map camelCase updates to DB columns
    const dbUpdates: any = { ...updates };
    if (typeof (updates as any).notificationsEnabled !== 'undefined') {
      dbUpdates.notifications_enabled = (updates as any).notificationsEnabled;
      delete dbUpdates.notificationsEnabled;
    }

    const { data, error } = await supabase
      .from('care_plan_tasks')
      .update({
        ...dbUpdates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteCarePlanTask(taskId: string) {
    const { error } = await supabase
      .from('care_plan_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  async getAppointments(userId: string) {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  // Return upcoming appointments (next N)
  async getUpcomingAppointments(userId: string, limit = 5) {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('user_id', userId)
      .gte('date', today)
      .order('date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  async createAppointment(userId: string, appointment: {
    title: string;
    type: string;
    date: string;
    time: string;
    location?: string;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        user_id: userId,
        ...appointment,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateAppointment(appointmentId: string, updates: {
    title?: string;
    type?: string;
    date?: string;
    time?: string;
    location?: string;
    notes?: string;
  }) {
    const { data, error } = await supabase
      .from('appointments')
      .update(updates)
      .eq('id', appointmentId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAppointment(appointmentId: string) {
    const { error } = await supabase
      .from('appointments')
      .delete()
      .eq('id', appointmentId);

    if (error) throw error;
  },

  async getMedications(userId: string) {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      active: m.active,
      notes: m.notes,
      reminderEnabled: typeof m.reminder_enabled === 'boolean' ? m.reminder_enabled : true,
      reminderTimes: Array.isArray(m.reminder_times) ? m.reminder_times : [],
    }));
  },

  async supportsMedicationReminders() {
    const { error } = await supabase
      .from('medications')
      .select('id, reminder_enabled, reminder_times')
      .limit(1);

    if (!error) {
      return true;
    }

    const message = error.message || '';
    if (
      error.code === '42703' ||
      error.code === 'PGRST204' ||
      /reminder_(enabled|times)/i.test(message)
    ) {
      return false;
    }

    throw error;
  },

  async getActiveMedications(userId: string) {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((m: any) => ({
      id: m.id,
      name: m.name,
      dosage: m.dosage,
      frequency: m.frequency,
      active: m.active,
      notes: m.notes,
      reminderEnabled: typeof m.reminder_enabled === 'boolean' ? m.reminder_enabled : true,
      reminderTimes: Array.isArray(m.reminder_times) ? m.reminder_times : [],
    }));
  },

  // Messaging helpers
  async getMessages(userId: string) {
    try {
      // Primary: messages table with sender_id/receiver_id
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, receiver_id, content, created_at, type, sender_name, delivered_at, read_at')
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .order('created_at', { ascending: true });

      if (!error) {
        const messages = (data || []).map((m: any) => ({
          id: m.id,
          senderId: m.sender_id,
          senderName: m.sender_name || '',
          message: m.content || m.message || '',
          timestamp: m.created_at ? new Date(m.created_at) : new Date(),
          type: m.type || 'text',
          deliveredAt: m.delivered_at ? new Date(m.delivered_at) : undefined,
          readAt: m.read_at ? new Date(m.read_at) : undefined,
        }));
        // Join profiles if senderName missing
        const missingIds = Array.from(new Set(messages.filter(m => !m.senderName).map(m => m.senderId))).filter(Boolean);
        if (missingIds.length) {
          const { data: profiles } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', missingIds);
          const nameMap: Record<string, string> = {};
          (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name || ''; });
          return messages.map(m => ({ ...m, senderName: m.senderName || nameMap[m.senderId] || 'User' }));
        }
        return messages;
      }

      // Fallback: some schemas store messages under chats -> try chat lookup
      const { data: chats, error: chatErr } = await supabase
        .from('chats')
        .select('id')
        .or(`patient_id.eq.${userId},caregiver_id.eq.${userId},created_by.eq.${userId}`);

      if (chatErr) throw chatErr;
      const chatIds = (chats || []).map((c: any) => c.id);
      if (chatIds.length === 0) return [];

      const { data: msgs, error: msgsErr } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, type, delivered_at, read_at')
        .in('chat_id', chatIds)
        .order('created_at', { ascending: true });

      if (msgsErr) throw msgsErr;
      const messages = (msgs || []).map((m: any) => ({
        id: m.id,
        senderId: m.sender_id,
        senderName: '',
        message: m.content || m.message || '',
        timestamp: m.created_at ? new Date(m.created_at) : new Date(),
        type: m.type || 'text',
        deliveredAt: m.delivered_at ? new Date(m.delivered_at) : undefined,
        readAt: m.read_at ? new Date(m.read_at) : undefined,
      }));
      const missingIds = Array.from(new Set(messages.filter(m => !m.senderName).map(m => m.senderId))).filter(Boolean);
      if (missingIds.length) {
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', missingIds);
        const nameMap: Record<string, string> = {};
        (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name || ''; });
        return messages.map(m => ({ ...m, senderName: nameMap[m.senderId] || 'User' }));
      }
      return messages;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('getMessages error:', err);
      throw err;
    }
  },

  async sendMessage(messageData: any) {
    try {
      // Try schema with receiver_id
      const insertObj: any = {
        sender_id: messageData.senderId,
        receiver_id: messageData.receiverId,
        content: messageData.message,
        type: messageData.type || 'text',
      };
      if (messageData.timestamp) insertObj.created_at = new Date(messageData.timestamp).toISOString();

      const { data, error } = await supabase.from('messages').insert([insertObj]).select().single();
      if (!error) return data;

      // If insert failed due to missing columns (e.g., no receiver_id), fall back to chats-based flow
      if (error && (error.code === '42703' || String(error.message).toLowerCase().includes('column'))) {
        const senderId = messageData.senderId;
        const receiverId = messageData.receiverId;

        // Try to find an existing chat between the two
        const { data: found } = await supabase
          .from('chats')
          .select('id')
          .or(`and(patient_id.eq.${senderId},caregiver_id.eq.${receiverId}),and(patient_id.eq.${receiverId},caregiver_id.eq.${senderId})`)
          .limit(1);

        let chatId = found && found[0] && found[0].id;
        if (!chatId) {
          // attempt to create a chat row
          const payload: any = { patient_id: senderId, caregiver_id: receiverId, created_by: senderId, created_at: new Date().toISOString() };
          const { data: createdChat, error: createErr } = await supabase.from('chats').insert([payload]).select('id').single();
          if (!createErr && createdChat) chatId = createdChat.id;
        }

        if (!chatId) throw error;

        const insert2: any = { chat_id: chatId, sender_id: senderId, content: messageData.message, type: messageData.type || 'text' };
        if (messageData.timestamp) insert2.created_at = new Date(messageData.timestamp).toISOString();
        const { data: d2, error: e2 } = await supabase.from('messages').insert([insert2]).select().single();
        if (e2) throw e2;
        return d2;
      }

      if (error) throw error;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('sendMessage error:', err);
      throw err;
    }
  },

  async markMessagesDelivered(userId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ delivered_at: new Date().toISOString() })
        .eq('receiver_id', userId)
        .is('delivered_at', null);
      if (error) throw error;
    } catch (err) {
      console.error('markMessagesDelivered error:', err);
    }
  },

  async markMessagesRead(userId: string) {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('receiver_id', userId)
        .is('read_at', null);
      if (error) throw error;
    } catch (err) {
      console.error('markMessagesRead error:', err);
    }
  },

  // Caregiver lookup helper
  async getCaregivers(userId: string) {
    try {
      // Prefer a dedicated caregivers table if present
      const { data, error } = await supabase
        .from('caregivers')
        .select('*')
        .eq('patient_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data && data.length) {
        return (data || []).map((c: any) => ({
          id: c.id,
          name: c.name || `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim(),
          role: c.role || 'Caregiver',
          isOnline: !!c.is_online
        }));
      }

      // Fallback: look for profiles with role='caregiver'
      const { data: profiles, error: pErr } = await supabase
        .from('user_profiles')
        .select('id, full_name, role')
        .eq('role', 'caregiver')
        .order('created_at', { ascending: false });

      if (pErr) throw pErr;
      return (profiles || []).map((p: any) => ({ id: p.id, name: p.full_name || '', role: p.role || 'Caregiver', isOnline: false }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('getCaregivers error:', err);
      return [];
    }
  },

  // Medication helpers
  async addMedication(userId: string, medicationData: any) {
    // Delegate to existing createMedication for consistency
    return this.createMedication(userId, medicationData as any);
  },

  async updateMedicationReminder(medId: string, enabled: boolean) {
    try {
      const { data, error } = await supabase
        .from('medications')
        .update({ reminder_enabled: enabled, updated_at: new Date().toISOString() })
        .eq('id', medId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('updateMedicationReminder error:', err);
      throw err;
    }
  },

  // Store AI analysis record
  async storeAIAnalysis(payload: {
    medical_record_id: string;
    user_id: string;
    analysis_type: string;
    findings?: Record<string, unknown> | null;
    confidence_score?: number | null;
    recommendations?: Record<string, unknown>[] | null;
  }) {
    const { data, error } = await supabase
      .from('ai_analyses')
      .insert({
        medical_record_id: payload.medical_record_id,
        user_id: payload.user_id,
        analysis_type: payload.analysis_type,
        findings: payload.findings,
        confidence_score: payload.confidence_score,
        recommendations: payload.recommendations,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createMedication(userId: string, medication: {
    name: string;
    dosage: string;
    frequency: string;
    active?: boolean;
    start_date?: string;
    end_date?: string;
    notes?: string;
    reminderEnabled?: boolean;
    reminderTimes?: string[];
  }) {
    const dbInsert: any = { user_id: userId, ...medication };
    if (typeof (medication as any).reminderEnabled !== 'undefined') {
      dbInsert.reminder_enabled = (medication as any).reminderEnabled;
      delete dbInsert.reminderEnabled;
    }
    if (Array.isArray((medication as any).reminderTimes)) {
      dbInsert.reminder_times = (medication as any).reminderTimes;
      delete dbInsert.reminderTimes;
    }

    const { data, error } = await supabase
      .from('medications')
      .insert(dbInsert)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateMedication(medicationId: string, updates: {
    name?: string;
    dosage?: string;
    frequency?: string;
    active?: boolean;
    start_date?: string;
    end_date?: string;
    notes?: string;
    reminderEnabled?: boolean;
    reminderTimes?: string[];
  }) {
    const dbUpdates: any = { ...updates };
    if (typeof (updates as any).reminderEnabled !== 'undefined') {
      dbUpdates.reminder_enabled = (updates as any).reminderEnabled;
      delete dbUpdates.reminderEnabled;
    }
    if (Array.isArray((updates as any).reminderTimes)) {
      dbUpdates.reminder_times = (updates as any).reminderTimes;
      delete dbUpdates.reminderTimes;
    }
    dbUpdates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('medications')
      .update(dbUpdates)
      .eq('id', medicationId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteMedication(medicationId: string) {
    const { error } = await supabase
      .from('medications')
      .delete()
      .eq('id', medicationId);

    if (error) throw error;
  },

  // Symptom Logs
  async createSymptomLog(userId: string, symptomData: any) {
    const { data, error } = await supabase
      .from('symptom_logs')
      .insert([{ ...symptomData, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getSymptomLogs(userId: string, days?: number) {
    let query: any = supabase
      .from('symptom_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });

    if (days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      query = query.gte('logged_at', cutoffDate.toISOString());
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  // Lab Results
  async createLabResult(userId: string, labData: any) {
    const { data, error } = await supabase
      .from('lab_results')
      .insert([{ ...labData, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getLabResults(userId: string) {
    const { data, error } = await supabase
      .from('lab_results')
      .select('*')
      .eq('user_id', userId)
      .order('result_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // AI Analyses — listing helper (storeAIAnalysis already exists above)
  async getAIAnalyses(userId: string) {
    const { data, error } = await supabase
      .from('ai_analyses')
      .select(`
        *,
        medical_records (name, category, upload_date)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Treatment Protocols
  async createTreatmentProtocol(userId: string, protocolData: any) {
    const { data, error } = await supabase
      .from('treatment_protocols')
      .insert([{ ...protocolData, user_id: userId }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getTreatmentProtocols(userId: string) {
    const { data, error } = await supabase
      .from('treatment_protocols')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // --- Task reminders CRUD & queries ---
  async createTaskReminder(taskId: string, reminderTime: string) {
    const { data, error } = await supabase
      .from('task_reminders')
      .insert({ task_id: taskId, reminder_time: reminderTime })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getRemindersForTask(taskId: string) {
    const { data, error } = await supabase
      .from('task_reminders')
      .select('*')
      .eq('task_id', taskId)
      .order('reminder_time', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getPendingReminders(limit = 100, before?: string) {
    let query = supabase
      .from('task_reminders')
      .select('*')
      .eq('sent', false)
      .order('reminder_time', { ascending: true })
      .limit(limit);

    if (before) {
      query = (query as any).lt('reminder_time', before);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async markReminderSent(reminderId: string) {
    const { data, error } = await supabase
      .from('task_reminders')
      .update({ sent: true })
      .eq('id', reminderId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Sync scheduled appointments into care plan tasks.
   * For each appointment, if there's no task with the same title and date, create one.
   * Returns the number of tasks created.
   */
  async syncAppointmentsToTasks(userId: string) {
    try {
      const appointments = await this.getAppointments(userId);
      const existingTasks = await this.getCarePlanTasks(userId);
      let created = 0;

      for (const apt of appointments) {
        const exists = existingTasks.some((t: any) => t.title === apt.title && String(t.date) === String(apt.date));
        if (!exists) {
          const { data, error } = await supabase
            .from('care_plan_tasks')
            .insert({
              user_id: userId,
              title: apt.title,
              description: `Scheduled appointment: ${apt.notes ?? 'No additional details'}`,
              category: 'treatment',
              status: 'upcoming',
              date: apt.date,
              time: apt.time,
              location: apt.location,
            })
            .select()
            .single();

          if (error) {
            // surface error but continue
            // eslint-disable-next-line no-console
            console.error('Error creating task from appointment:', error);
          } else {
            created += 1;
            // keep existingTasks in sync so duplicates aren't created in the same run
            existingTasks.push(data);
          }
        }
      }

      return created;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('syncAppointmentsToTasks error:', err);
      throw err;
    }
  },
};
