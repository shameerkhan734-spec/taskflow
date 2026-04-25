const express = require('express');
const router = express.Router();
const { register, Counter, Histogram, Gauge } = require('prom-client');

// ─── Custom Metrics ────────────────────────────────────────────────────────────

// Count total HTTP requests
const httpRequestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

// Track response durations
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

// Track active connections
const activeConnections = new Gauge({
  name: 'active_connections',
  help: 'Number of currently active HTTP connections',
});

// Export metric helpers for use in other middleware
module.exports.httpRequestCounter = httpRequestCounter;
module.exports.httpRequestDuration = httpRequestDuration;
module.exports.activeConnections = activeConnections;

// ─── Metrics Endpoint (scraped by Prometheus) ─────────────────────────────────
router.get('/', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
});

module.exports = router;
