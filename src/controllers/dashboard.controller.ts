import type { Request, Response } from 'express';
import {
  getConditionDistribution,
  getPatientTrends,
  getPatientsPerDoctor,
  getRecentPatients,
  getSpecializationDistribution,
  getStats,
} from '../services/dashboard.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import { dashboardRangeQuery } from '../validators/common';

const range = (req: Request) => dashboardRangeQuery.parse(req.query);

export const statsController = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getStats());
});

export const trendsController = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await getPatientTrends(range(req)));
});

export const patientsPerDoctorController = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getPatientsPerDoctor());
});

export const conditionsController = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getConditionDistribution());
});

export const specializationsController = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getSpecializationDistribution());
});

export const recentPatientsController = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await getRecentPatients(5));
});
