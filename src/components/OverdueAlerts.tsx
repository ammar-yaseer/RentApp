// OverdueAlerts — subscribes to the notifications table via Supabase Realtime.
// When the overdue-alerts edge function inserts a notification row, this
// component shows a toast. Replaces the old client-side polling approach.
import { useEffect, useRef } from 'react';
import { useStore } from '../data/store';
import { useToast } from './Toast';
import { supabase } from '../lib/supabase';

export function OverdueAlerts() {
  const { db } = useStore();
  const toast = useToast();
  const shownRef = useRef<Set<string>>(new Set());

  // Show toasts for existing unread Popup notifications on load
  useEffect(() => {
    const unread = db.notifications.filter(
      (n) => n.channel === 'Popup' && !n.read && n.status === 'Sent' && !shownRef.current.has(n.id),
    );
    for (const n of unread) {
      shownRef.current.add(n.id);
      if (n.type.includes('Overdue')) toast.error(n.subject, n.message);
      else if (n.type.includes('Due') || n.type.includes('Expiry')) toast.warning(n.subject, n.message);
      else toast.info(n.subject, n.message);
    }
  }, [db.notifications, toast]);

  // Subscribe to new notification inserts via Realtime
  useEffect(() => {
    const channel = supabase
      .channel('overdue-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload: any) => {
          const n = payload.new;
          if (n.channel !== 'Popup' || shownRef.current.has(n.id)) return;
          shownRef.current.add(n.id);
          if (n.type.includes('Overdue')) toast.error(n.subject, n.message);
          else if (n.type.includes('Due') || n.type.includes('Expiry')) toast.warning(n.subject, n.message);
          else toast.info(n.subject, n.message);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [toast]);

  return null;
}
