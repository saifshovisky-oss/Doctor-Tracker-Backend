import { Router } from 'express';
import {
  conditionsController,
  createPatientController,
  deletePatientController,
  getPatientController,
  listPatientsController,
  updatePatientController,
} from '../../controllers/patient.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { idParamSchema } from '../../validators/common';
import { createPatientSchema, patientListQuery, updatePatientSchema } from '../../validators/patient';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: patientListQuery }), listPatientsController);
router.get('/conditions', conditionsController);
router.post('/', validate({ body: createPatientSchema }), createPatientController);
router.get('/:id', validate({ params: idParamSchema }), getPatientController);
router.patch('/:id', validate({ params: idParamSchema, body: updatePatientSchema }), updatePatientController);
router.delete('/:id', validate({ params: idParamSchema }), deletePatientController);

export default router;
