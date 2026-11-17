import type { Request, Response } from 'express';
import {
  createPatient,
  deletePatient,
  getPatient,
  listConditions,
  listPatients,
  updatePatient,
} from '../services/patient.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import type { CreatePatientInput, PatientListQuery, UpdatePatientInput } from '../validators/patient';

export const listPatientsController = asyncHandler(async (req: Request, res: Response) => {
  const result = await listPatients(req.query as unknown as PatientListQuery);
  sendSuccess(res, result);
});

export const getPatientController = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await getPatient(req.params.id!));
});

export const createPatientController = asyncHandler(async (req: Request, res: Response) => {
  const patient = await createPatient(req.body as CreatePatientInput);
  sendSuccess(res, patient, 201, 'Patient created successfully');
});

export const updatePatientController = asyncHandler(async (req: Request, res: Response) => {
  const patient = await updatePatient(req.params.id!, req.body as UpdatePatientInput);
  sendSuccess(res, patient, 200, 'Patient updated successfully');
});

export const conditionsController = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await listConditions());
});

export const deletePatientController = asyncHandler(async (req: Request, res: Response) => {
  await deletePatient(req.params.id!);
  sendSuccess(res, { id: req.params.id }, 200, 'Patient deleted successfully');
});
