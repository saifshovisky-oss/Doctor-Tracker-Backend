import { Router } from 'express';
import {
  conditionsController,
  createPatientController,
  deletePatientController,
  getPatientController,
  listPatientsController,
  updatePatientController,
} from '../../controllers/patient.controller';
import {
  deletePhotoController,
  getPhotoController,
  uploadPhotoController,
} from '../../controllers/photo.controller';
import { requireAuth } from '../../middleware/auth';
import { photoUploadMiddleware } from '../../middleware/upload';
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

router.get('/:id/photo', validate({ params: idParamSchema }), getPhotoController('patients'));
router.post('/:id/photo', validate({ params: idParamSchema }), photoUploadMiddleware, uploadPhotoController('patients'));
router.delete('/:id/photo', validate({ params: idParamSchema }), deletePhotoController('patients'));

export default router;
