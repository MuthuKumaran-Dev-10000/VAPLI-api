const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const clientRoutes = require('./clientRoutes');
const tankRoutes = require('./tankRoutes');
const readingRoutes = require('./readingRoutes');
const alertRoutes = require('./alertRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const userRoutes = require('./userRoutes');
const uploadRoutes = require('./uploadRoutes');
const auditRoutes = require('./auditRoutes');

router.use('/auth', authRoutes);
router.use('/clients', clientRoutes);
router.use('/clients/:clientId', tankRoutes);
router.use('/clients/:clientId', readingRoutes);
router.use('/clients/:clientId', alertRoutes);
router.use('/clients/:clientId', dashboardRoutes);
router.use('/users', userRoutes);
router.use('/uploads', uploadRoutes);
router.use('/', auditRoutes);

module.exports = router;
