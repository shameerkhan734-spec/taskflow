const express = require('express');
const router = express.Router();
const os = require('os');

// Basic health check — used by AWS ALB, ECS, load balancers
router.get('/', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Detailed readiness check — used by Kubernetes / ECS readiness probes
router.get('/ready', (req, res) => {
  const memUsage = process.memoryUsage();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    uptime: `${Math.floor(process.uptime())}s`,
    system: {
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      cpuCount: os.cpus().length,
      totalMemoryMB: (totalMem / 1024 / 1024).toFixed(2),
      freeMemoryMB: (freeMem / 1024 / 1024).toFixed(2),
      memoryUsagePercent: (((totalMem - freeMem) / totalMem) * 100).toFixed(2),
    },
    process: {
      pid: process.pid,
      heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
    },
  });
});

// Liveness probe — if this fails, restart the container
router.get('/live', (req, res) => {
  res.status(200).json({ alive: true });
});

module.exports = router;
