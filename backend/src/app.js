import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import path from 'path';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import adminVendorRoutes from './routes/adminVendorRoutes.js';
import assignmentRoutes from './routes/assignmentRoutes.js';
import authRoutes from './routes/authRoutes.js';
import boothRoutes from './routes/boothRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import eventDayRoutes from './routes/eventDayRoutes.js';
import mapRoutes from './routes/mapRoutes.js';
import opsRoutes from './routes/opsRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import readinessRoutes from './routes/readinessRoutes.js';
import showRoutes from './routes/showRoutes.js';
import vendorRoutes from './routes/vendorRoutes.js';
import vendorHelpRoutes from './routes/vendorHelpRoutes.js';

export const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);
app.use(
  cors({
    origin: env.frontendOrigin,
    credentials: true
  })
);
app.use(express.json({ limit: '1mb' }));
app.use('/uploads/vendor-logos', express.static(path.join(env.uploadDir, 'vendor-logos')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api', assignmentRoutes);
app.use('/api/admin', adminVendorRoutes);
app.use('/api/admin', eventDayRoutes);
app.use('/api/admin', opsRoutes);
app.use('/api/admin', readinessRoutes);
app.use('/api/admin/shows', showRoutes);
app.use('/api/admin/shows', mapRoutes);
app.use('/api/admin/shows', boothRoutes);
app.use('/api/vendor', vendorRoutes);
app.use('/api/vendor', vendorHelpRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
