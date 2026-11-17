import { Router } from 'express';
import {
  createDoctorController,
  deleteDoctorController,
  getDoctorController,
  listDoctorsController,
  specializationsController,
  updateDoctorController,
} from '../../controllers/doctor.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { idParamSchema } from '../../validators/common';
import { createDoctorSchema, doctorListQuery, updateDoctorSchema } from '../../validators/doctor';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: doctorListQuery }), listDoctorsController);
router.get('/specializations', specializationsController);
router.post('/', validate({ body: createDoctorSchema }), createDoctorController);
router.get('/:id', validate({ params: idParamSchema }), getDoctorController);
router.patch('/:id', validate({ params: idParamSchema, body: updateDoctorSchema }), updateDoctorController);
router.delete('/:id', validate({ params: idParamSchema }), deleteDoctorController);

export default router;
