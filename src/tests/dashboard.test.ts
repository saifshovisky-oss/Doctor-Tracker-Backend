import request from 'supertest';
import type { Express } from 'express';
import { beforeEach, describe, expect, it } from 'vitest';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { authenticatedAgent, makeApp, seedDoctors, seedPatients } from './helpers';

let app: Express;
beforeEach(() => {
  app = makeApp();
});

describe('Dashboard analytics', () => {
  it('returns real KPI counts including this-month increments', async () => {
    const doctors = await seedDoctors(3);
    const patients = await seedPatients(5, String(doctors[0]!._id));
    await Doctor.collection.updateOne(
      { _id: doctors[1]!._id },
      { $set: { createdAt: new Date('2023-01-01T00:00:00Z') } },
    );
    await Patient.collection.updateOne(
      { _id: patients[0]!._id },
      { $set: { createdAt: new Date('2023-01-01T00:00:00Z') } },
    );

    const agent = await authenticatedAgent(app);
    const res = await agent.get('/api/v1/dashboard/stats');
    expect(res.status).toBe(200);
    expect(res.body.data.totalDoctors).toBe(3);
    expect(res.body.data.totalPatients).toBe(5);
    expect(res.body.data.newDoctorsThisMonth).toBe(2);
    expect(res.body.data.newPatientsThisMonth).toBe(4);
  });

  it('returns monthly patient registration trends with zero-filled buckets', async () => {
    const [doctor] = await seedDoctors(1);
    const [patient] = await seedPatients(1, String(doctor!._id));
    await Patient.collection.updateOne({ _id: patient!._id }, { $set: { createdAt: new Date() } });

    const agent = await authenticatedAgent(app);
    const res = await agent.get('/api/v1/dashboard/patient-trends?months=6');
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(6);
    const current = res.body.data.at(-1);
    expect(current.count).toBe(1);
    expect(current.date).toMatch(/^\d{4}-\d{2}-01$/);
  });

  it('returns patients per doctor sorted by count', async () => {
    const doctors = await seedDoctors(2);
    await seedPatients(3, String(doctors[0]!._id));
    await seedPatients(1, String(doctors[1]!._id));
    const agent = await authenticatedAgent(app);
    const res = await agent.get('/api/v1/dashboard/patients-per-doctor');
    expect(res.status).toBe(200);
    expect(res.body.data[0].name).toBe('Doctor 1');
    expect(res.body.data[0].count).toBe(3);
  });

  it('returns condition and specialization distributions', async () => {
    const doctors = await seedDoctors(4);
    await seedPatients(3, String(doctors[0]!._id));
    const agent = await authenticatedAgent(app);

    const conditions = await agent.get('/api/v1/dashboard/conditions');
    expect(conditions.status).toBe(200);
    expect(conditions.body.data[0]).toEqual({ name: 'Hypertension', value: 2 });

    const specializations = await agent.get('/api/v1/dashboard/specializations');
    expect(specializations.body.data).toEqual([
      { name: 'Cardiology', value: 2 },
      { name: 'Dermatology', value: 2 },
    ]);
  });

  it('validates dashboard query parameters', async () => {
    const agent = await authenticatedAgent(app);
    const res = await agent.get('/api/v1/dashboard/patient-trends?months=99');
    expect(res.status).toBe(400);
  });

  it('is empty-safe on a fresh database', async () => {
    const agent = await authenticatedAgent(app);
    const stats = await agent.get('/api/v1/dashboard/stats');
    expect(stats.body.data.totalDoctors).toBe(0);
    const trends = await agent.get('/api/v1/dashboard/patient-trends');
    expect(trends.body.data.every((p: { count: number }) => p.count === 0)).toBe(true);
    expect((await agent.get('/api/v1/dashboard/conditions')).body.data).toEqual([]);
  });
});
