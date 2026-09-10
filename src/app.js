const path = require('path');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./modules/auth/auth.routes');
const clientsRoutes = require('./modules/clients/clients.routes');
const usersRoutes = require('./modules/users/users.routes');
const assetsRoutes = require('./modules/assets/assets.routes');
const readingsRoutes = require('./modules/readings/readings.routes');
const uploadsRoutes = require('./modules/uploads/uploads.routes');
const { errorHandler } = require('./middleware/error.middleware');
const { successResponse } = require('./core/response');
const auditService = require('./modules/audit/audit.service');

const app = express();

app.use(cors());
app.use(express.json());

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/health', (req, res) => {
  return successResponse(res, { status: 'OK', system: 'vapli-api', timestamp: new Date().toISOString() }, 200);
});

// API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/clients', clientsRoutes);
app.use('/api/v1/users', usersRoutes);
app.use('/api/v1/assets', assetsRoutes);
app.use('/api/v1/readings', readingsRoutes);
app.use('/api/v1/uploads', uploadsRoutes);

// Audit logs route
app.get('/api/v1/audit-logs', async (req, res, next) => {
  try {
    const logs = await auditService.getAuditLogs(req.query);
    return successResponse(res, { logs }, 200);
  } catch (e) {
    next(e);
  }
});

// Centralized Error Handler
app.use(errorHandler);

module.exports = app;
