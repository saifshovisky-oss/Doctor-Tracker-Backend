import { Router } from 'express';
import { healthController } from '../../controllers/health.controller';
import authRoutes from './auth.routes';
import conditionRoutes from './condition.routes';
import dashboardRoutes from './dashboard.routes';
import doctorRoutes from './doctor.routes';
import patientRoutes from './patient.routes';

const router = Router();

router.get('/health', healthController);
router.use('/auth', authRoutes);
router.use('/doctors', doctorRoutes);
router.use('/patients', patientRoutes);
router.use('/conditions', conditionRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
