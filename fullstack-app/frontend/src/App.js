import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle2, Circle, Trash2, Plus, RefreshCw, BarChart3, Clock, CheckCheck } from 'lucide-react';
import './App.css';

const API = process.env.REACT_APP_API_URL || '/api/v1';

function App() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0 });
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('all');

  const fetchTasks = useCallback(async () => {
    try {
      const [tasksRes, statsRes] = await Promise.all([
        axios.get(`${API}/tasks`),
        axios.get(`${API}/stats`),
      ]);
      setTasks(tasksRes.data.data);
      setStats(statsRes.data.data);
    } catch (err) {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await axios.post(`${API}/tasks`, { title: newTitle.trim() });
      setTasks(prev => [res.data.data, ...prev]);
      setStats(prev => ({ ...prev, total: prev.total + 1, pending: prev.pending + 1 }));
      setNewTitle('');
      toast.success('Task added!');
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0]?.msg || 'Failed to add task');
    } finally {
      setAdding(false);
    }
  };

  const toggleTask = async (task) => {
    try {
      const res = await axios.put(`${API}/tasks/${task.id}`, {
        title: task.title,
        completed: !task.completed,
      });
      setTasks(prev => prev.map(t => t.id === task.id ? res.data.data : t));
      setStats(prev => ({
        ...prev,
        completed: prev.completed + (task.completed ? -1 : 1),
        pending: prev.pending + (task.completed ? 1 : -1),
      }));
    } catch {
      toast.error('Failed to update task');
    }
  };

  const deleteTask = async (id) => {
    try {
      await axios.delete(`${API}/tasks/${id}`);
      const deleted = tasks.find(t => t.id === id);
      setTasks(prev => prev.filter(t => t.id !== id));
      setStats(prev => ({
        ...prev,
        total: prev.total - 1,
        completed: deleted?.completed ? prev.completed - 1 : prev.completed,
        pending: !deleted?.completed ? prev.pending - 1 : prev.pending,
      }));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const filtered = tasks.filter(t => {
    if (filter === 'completed') return t.completed;
    if (filter === 'pending') return !t.completed;
    return true;
  });

  return (
    <div className="app">
      <Toaster position="top-right" />

      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">⬡</span>
            <span className="logo-text">TaskFlow</span>
          </div>
          <div className="header-badge">Production Ready</div>
        </div>
      </header>

      <main className="main">
        {/* Stats */}
        <div className="stats-grid">
          <div className="stat-card stat-total">
            <BarChart3 size={20} />
            <div>
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Tasks</div>
            </div>
          </div>
          <div className="stat-card stat-pending">
            <Clock size={20} />
            <div>
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">In Progress</div>
            </div>
          </div>
          <div className="stat-card stat-done">
            <CheckCheck size={20} />
            <div>
              <div className="stat-value">{stats.completed}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {stats.total > 0 && (
          <div className="progress-container">
            <div className="progress-label">
              <span>Progress</span>
              <span>{Math.round((stats.completed / stats.total) * 100)}%</span>
            </div>
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${(stats.completed / stats.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Add Task */}
        <form onSubmit={addTask} className="add-form">
          <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Add a new task..."
            className="task-input"
            disabled={adding}
          />
          <button type="submit" className="add-btn" disabled={adding || !newTitle.trim()}>
            <Plus size={18} />
            {adding ? 'Adding...' : 'Add Task'}
          </button>
        </form>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          {['all', 'pending', 'completed'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              <span className="filter-count">
                {f === 'all' ? tasks.length : f === 'completed' ? stats.completed : stats.pending}
              </span>
            </button>
          ))}
          <button onClick={fetchTasks} className="refresh-btn" title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>

        {/* Task List */}
        <div className="task-list">
          {loading ? (
            <div className="loading-state">
              {[1,2,3].map(i => <div key={i} className="skeleton" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <p>No tasks here. {filter === 'pending' ? 'All done!' : 'Add one above.'}</p>
            </div>
          ) : (
            filtered.map(task => (
              <div key={task.id} className={`task-item ${task.completed ? 'done' : ''}`}>
                <button onClick={() => toggleTask(task)} className="toggle-btn">
                  {task.completed
                    ? <CheckCircle2 size={22} className="check-icon done" />
                    : <Circle size={22} className="check-icon" />}
                </button>
                <span className="task-title">{task.title}</span>
                <span className="task-date">
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
                <button onClick={() => deleteTask(task.id)} className="delete-btn">
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </main>

      <footer className="footer">
        <span>TaskFlow © 2024 · Built with React + Node.js · Deployed on AWS</span>
      </footer>
    </div>
  );
}

export default App;
