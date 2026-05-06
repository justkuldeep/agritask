import { useState, useCallback } from 'react';
import { notificationsAPI } from '../services/api';

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async (unreadOnly = false) => {
    setLoading(true);
    try {
      const res = await notificationsAPI.list({ unread: unreadOnly });
      const list = res.data || [];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.read_at).length);
    } catch (_) {
      // silently fail for notifications
    } finally {
      setLoading(false);
    }
  }, []);

  const markRead = useCallback(async (id) => {
    await notificationsAPI.markRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)),
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  return { notifications, unreadCount, loading, fetchNotifications, markRead };
}
