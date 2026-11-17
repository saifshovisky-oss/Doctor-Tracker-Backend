import request from 'supertest';
import type { Express } from 'express';
import { beforeEach, describe, expect, it } from 'vitest';
import { Patient } from '../models/Patient';
import { authenticatedAgent, makeApp, seedDoctors, seedPatients } from './helpers';

let app: Express;
let doctorId: string;

beforeEach(async () => {
  app = makeApp();
  const [doctor] = await seedDoctors(1);
  doctorId = String(doctor!._id);
});

const payload = {
  name: 'Jane Doe',
  age: 42,
  gender: 'female',
  phone: '555-9876',
  email: 'jane@test.local',
  condition: 'Hypertension',
  doctorId: () => doctorId,
  notes: 'Check monthly',
};

const body = () => ({ ...payload, doctorId });

describe('Patients', () => {
  it('creates a patient with a doctor reference', async () => {
    const agent = await authenticatedAgent(app);
    const res = await agent.post('/api/v1/patients').send(body());
    expect(res.status).toBe(201);
    expect(res.body.data.doctorId).toBe(doctorId);
    expect(res.body.data.doctorName).toBe('Doctor 1');
    expect(res.body.data.email).toBe('jane@test.local');
  });

  it('supports patients without optional contact fields', async () => {
    const agent = await authenticatedAgent(app);
    const res = await agent.post('/api/v1/patients').send({ name: 'No Contact', condition: 'Flu', doctorId });
    expect(res.status).toBe(201);
    expect(res.body.data.email).toBeUndefined();
    expect(res.body.data.phone).toBeUndefined();
  });

  it('rejects invalid or missing doctors', async () => {
    const agent = await authenticatedAgent(app);
    expect((await agent.post('/api/v1/patients').send({ ...body(), doctorId: 'bad-id' })).status).toBe(400);
    expect(
      (await agent.post('/api/v1/patients').send({ ...body(), doctorId: '64b7f0000000000000000000' })).status,
    ).toBe(400);
    expect((await agent.post('/api/v1/patients').send({ name: 'X', condition: 'Y' })).status).toBe(400);
  });

  it('rejects invalid input', async () => {
    const agent = await authenticatedAgent(app);
    const res = await agent.post('/api/v1/patients').send({ ...body(), age: 500, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('age');
    expect(res.body.error.details).toHaveProperty('email');
  });

  it('paginates, searches and filters server-side', async () => {
    await seedPatients(12, doctorId);
    const agent = await authenticatedAgent(app);

    const page = await agent.get('/api/v1/patients?page=2&limit=5');
    expect(page.body.data.data).toHaveLength(5);
    expect(page.body.data.totalItems).toBe(12);
    expect(page.body.data.totalPages).toBe(3);
    expect(page.body.data.currentPage).toBe(2);

    const search = await agent.get('/api/v1/patients?search=Patient 10');
    expect(search.body.data.totalItems).toBe(1);

    const condition = await agent.get('/api/v1/patients?condition=Hypertension');
    expect(condition.body.data.totalItems).toBe(6);

    const byDoctor = await agent.get(`/api/v1/patients?doctorId=${doctorId}`);
    expect(byDoctor.body.data.totalItems).toBe(12);
    expect(byDoctor.body.data.data[0].doctorName).toBe('Doctor 1');
  });

  it('searches by email and phone and filters by date range', async () => {
    const agent = await authenticatedAgent(app);
    await agent.post('/api/v1/patients').send(body());
    const [old] = await seedPatients(1, doctorId);
    await Patient.collection.updateOne(
      { _id: old!._id },
      { $set: { createdAt: new Date('2023-06-10T00:00:00Z') } },
    );

    expect((await agent.get('/api/v1/patients?search=jane@test')).body.data.totalItems).toBe(1);
    expect((await agent.get('/api/v1/patients?search=555-9876')).body.data.totalItems).toBe(1);
    expect((await agent.get('/api/v1/patients?startDate=2023-06-01&endDate=2023-06-30')).body.data.totalItems).toBe(1);
  });

  it('sorts records', async () => {
    await seedPatients(4, doctorId);
    const agent = await authenticatedAgent(app);
    const res = await agent.get('/api/v1/patients?sortBy=name&sortOrder=asc&limit=10');
    const names = res.body.data.data.map((p: { name: string }) => p.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('gets, updates and deletes a patient', async () => {
    const agent = await authenticatedAgent(app);
    const created = await agent.post('/api/v1/patients').send(body());
    const id = created.body.data.id;

    expect((await agent.get(`/api/v1/patients/${id}`)).status).toBe(200);
    const updated = await agent.patch(`/api/v1/patients/${id}`).send({ condition: 'Diabetes', age: 43 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.condition).toBe('Diabetes');
    expect((await agent.delete(`/api/v1/patients/${id}`)).status).toBe(200);
    expect((await agent.get(`/api/v1/patients/${id}`)).status).toBe(404);
    expect((await agent.delete(`/api/v1/patients/${id}`)).status).toBe(404);
  });

  it('lists distinct conditions for form suggestions', async () => {
    const agent = await authenticatedAgent(app);
    await seedPatients(3, doctorId);
    const res = await agent.get('/api/v1/patients/conditions');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(['Diabetes', 'Hypertension']);
  });

  it('handles invalid ids', async () => {
    const agent = await authenticatedAgent(app);
    expect((await agent.get('/api/v1/patients/nope')).status).toBe(400);
  });
});
