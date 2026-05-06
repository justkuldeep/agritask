import { useState, useCallback } from 'react';
import { tasksAPI } from '../services/api';

export function useTasks() {
  const [tasks, setTasks] = useState([]);
  const [meta, setMeta] = useState({ total: 0, pending: 0, active: 0, efficiency: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTasks = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await tasksAPI.list(params);
      setTasks(res.data.tasks || []);
      setMeta(res.data.meta || { total: 0, pending: 0, active: 0, efficiency: 0 });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createTask = useCallback(async (data) => {
    const res = await tasksAPI.create(data);
    return res.data;
  }, []);

  const updateTask = useCallback(async (id, data) => {
    const res = await tasksAPI.update(id, data);
    setTasks((prev) => prev.map((t) => (t.id === id ? res.data : t)));
    return res.data;
  }, []);

  const deleteTask = useCallback(async (id) => {
    await tasksAPI.delete(id);
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const submitRecord = useCallback(async (taskId, data) => {
    const res = await tasksAPI.submitRecord(taskId, data);
    return res.data;
  }, []);

  return {
    tasks,
    meta,
    loading,
    error,
    fetchTasks,
    createTask,
    updateTask,
    deleteTask,
    submitRecord,
  };
}
