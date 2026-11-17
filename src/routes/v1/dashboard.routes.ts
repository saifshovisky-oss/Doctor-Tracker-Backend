import { Router } from 'express';
import {
  conditionsController,
  patientsPerDoctorController,
  recentPatientsController,
  specializationsController,
  statsController,
  trendsController,
} from '../../controllers/dashboard.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { dashboardRangeQuery } from '../../validators/common';

const router = Router();
router.use(requireAuth);

router.get('/stats', statsController);
router.get('/patient-trends', validate({ query: dashboardRangeQuery }), trendsController);
router.get('/patients-per-doctor', patientsPerDoctorController);
router.get('/conditions', conditionsController);
router.get('/specializations', specializationsController);
router.get('/recent-patients', recentPatientsController);

export default router;
