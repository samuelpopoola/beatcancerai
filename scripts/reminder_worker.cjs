/*
  Reminder Worker Script
  Polls task_reminders and medications for due reminders.
  Requires environment variables:
    SUPABASE_URL
    SUPABASE_SERVICE_ROLE_KEY (service role for RLS bypass on server side)

  Run: node scripts/reminder_worker.cjs
*/

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const POLL_INTERVAL_MS = 60 * 1000; // 1 minute
const MED_WINDOW_MINUTES = 5; // fire window for medication times

async function pollTaskReminders() {
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('task_reminders')
      .select('id, task_id, reminder_time, sent')
      .eq('sent', false)
      .lte('reminder_time', nowIso)
      .order('reminder_time', { ascending: true })
      .limit(200);
    if (error) throw error;

    for (const r of data || []) {
      console.log(`[TaskReminder] Triggering task_id=${r.task_id} at ${r.reminder_time}`);
      // Mark sent
      const { error: updErr } = await supabase
        .from('task_reminders')
        .update({ sent: true })
        .eq('id', r.id);
      if (updErr) console.error('Failed to mark reminder sent', updErr);
    }
  } catch (e) {
    console.error('pollTaskReminders error', e);
  }
}

function hhmmToTodayDate(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

async function pollMedicationReminders() {
  try {
    const { data, error } = await supabase
      .from('medications')
      .select('id, user_id, name, reminder_enabled, reminder_times, active')
      .eq('active', true)
      .eq('reminder_enabled', true);
    if (error) throw error;

    const now = new Date();
    for (const med of data || []) {
      const times = Array.isArray(med.reminder_times) ? med.reminder_times : [];
      for (const t of times) {
        if (typeof t !== 'string') continue;
        const target = hhmmToTodayDate(t);
        const diffMin = Math.abs((target.getTime() - now.getTime()) / 60000);
        if (diffMin <= MED_WINDOW_MINUTES) {
          console.log(`[MedicationReminder] User ${med.user_id} medication '${med.name}' time ${t}`);
          // Here you could enqueue a notification, email, push, etc.
        }
      }
    }
  } catch (e) {
    console.error('pollMedicationReminders error', e);
  }
}

async function loop() {
  await pollTaskReminders();
  await pollMedicationReminders();
}

console.log('Reminder worker started. Polling every', POLL_INTERVAL_MS / 1000, 'seconds');
loop();
setInterval(loop, POLL_INTERVAL_MS);
