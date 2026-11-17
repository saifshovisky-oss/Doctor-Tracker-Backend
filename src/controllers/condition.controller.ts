import type { Request, Response } from 'express';
import {
  createCondition,
  deleteCondition,
  listConditions,
  updateCondition,
} from '../services/condition.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import type { ConditionListQuery, CreateConditionInput, UpdateConditionInput } from '../validators/condition';

export const listConditionsController = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await listConditions(req.query as unknown as ConditionListQuery));
});

export const createConditionController = asyncHandler(async (req: Request, res: Response) => {
  const condition = await createCondition(req.body as CreateConditionInput);
  sendSuccess(res, condition, 201, 'Condition added successfully');
});

export const updateConditionController = asyncHandler(async (req: Request, res: Response) => {
  const condition = await updateCondition(req.params.id!, req.body as UpdateConditionInput);
  sendSuccess(res, condition, 200, 'Condition updated successfully');
});

export const deleteConditionController = asyncHandler(async (req: Request, res: Response) => {
  await deleteCondition(req.params.id!);
  sendSuccess(res, { id: req.params.id }, 200, 'Condition deleted successfully');
});
