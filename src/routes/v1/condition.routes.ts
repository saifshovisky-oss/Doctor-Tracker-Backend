import { Router } from 'express';
import {
  createConditionController,
  deleteConditionController,
  listConditionsController,
  updateConditionController,
} from '../../controllers/condition.controller';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { idParamSchema } from '../../validators/common';
import { conditionListQuery, createConditionSchema, updateConditionSchema } from '../../validators/condition';

const router = Router();
router.use(requireAuth);

router.get('/', validate({ query: conditionListQuery }), listConditionsController);
router.post('/', validate({ body: createConditionSchema }), createConditionController);
router.patch('/:id', validate({ params: idParamSchema, body: updateConditionSchema }), updateConditionController);
router.delete('/:id', validate({ params: idParamSchema }), deleteConditionController);

export default router;
