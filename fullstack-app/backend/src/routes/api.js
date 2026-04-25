const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

// ─── In-memory store (replace with MongoDB in production) ─────────────────────
let tasks = [
  { id: uuidv4(), title: 'Deploy to AWS', completed: false, createdAt: new Date().toISOString() },
  { id: uuidv4(), title: 'Setup monitoring', completed: false, createdAt: new Date().toISOString() },
  { id: uuidv4(), title: 'Write tests', completed: true, createdAt: new Date().toISOString() },
];

// ─── Validation Rules ─────────────────────────────────────────────────────────
const taskValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 2, max: 200 }).withMessage('Title must be 2–200 characters'),
];

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  next();
};

// ─── GET /api/v1/tasks ────────────────────────────────────────────────────────
router.get('/tasks', (req, res) => {
  const { completed } = req.query;
  let result = [...tasks];

  if (completed !== undefined) {
    result = result.filter(t => t.completed === (completed === 'true'));
  }

  res.json({
    success: true,
    count: result.length,
    data: result,
  });
});

// ─── GET /api/v1/tasks/:id ────────────────────────────────────────────────────
router.get('/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true, data: task });
});

// ─── POST /api/v1/tasks ───────────────────────────────────────────────────────
router.post('/tasks', taskValidation, validate, (req, res) => {
  const task = {
    id: uuidv4(),
    title: req.body.title,
    completed: false,
    createdAt: new Date().toISOString(),
  };
  tasks.push(task);
  res.status(201).json({ success: true, data: task });
});

// ─── PUT /api/v1/tasks/:id ────────────────────────────────────────────────────
router.put('/tasks/:id', taskValidation, validate, (req, res) => {
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });

  tasks[idx] = {
    ...tasks[idx],
    title: req.body.title,
    completed: req.body.completed ?? tasks[idx].completed,
    updatedAt: new Date().toISOString(),
  };
  res.json({ success: true, data: tasks[idx] });
});

// ─── DELETE /api/v1/tasks/:id ─────────────────────────────────────────────────
router.delete('/tasks/:id', (req, res) => {
  const idx = tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  tasks.splice(idx, 1);
  res.json({ success: true, message: 'Task deleted' });
});

// ─── GET /api/v1/stats ────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  res.json({
    success: true,
    data: {
      total: tasks.length,
      completed: tasks.filter(t => t.completed).length,
      pending: tasks.filter(t => !t.completed).length,
    },
  });
});

module.exports = router;
