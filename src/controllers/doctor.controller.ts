import type { Request, Response } from 'express';
import {
  createDoctor,
  deleteDoctor,
  getDoctor,
  listDoctors,
  listSpecializations,
  updateDoctor,
} from '../services/doctor.service';
import { asyncHandler } from '../utils/asyncHandler';
import { sendSuccess } from '../utils/response';
import type { CreateDoctorInput, DoctorListQuery, UpdateDoctorInput } from '../validators/doctor';

export const listDoctorsController = asyncHandler(async (req: Request, res: Response) => {
  const result = await listDoctors(req.query as unknown as DoctorListQuery);
  sendSuccess(res, result);
});

export const getDoctorController = asyncHandler(async (req: Request, res: Response) => {
  sendSuccess(res, await getDoctor(req.params.id!));
});

export const createDoctorController = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await createDoctor(req.body as CreateDoctorInput);
  sendSuccess(res, doctor, 201, 'Doctor created successfully');
});

export const updateDoctorController = asyncHandler(async (req: Request, res: Response) => {
  const doctor = await updateDoctor(req.params.id!, req.body as UpdateDoctorInput);
  sendSuccess(res, doctor, 200, 'Doctor updated successfully');
});

export const deleteDoctorController = asyncHandler(async (req: Request, res: Response) => {
  await deleteDoctor(req.params.id!);
  sendSuccess(res, { id: req.params.id }, 200, 'Doctor deleted successfully');
});

export const specializationsController = asyncHandler(async (_req: Request, res: Response) => {
  sendSuccess(res, await listSpecializations());
});
