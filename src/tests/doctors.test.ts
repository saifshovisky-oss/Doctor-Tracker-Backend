import request from 'supertest';
import type { Express } from 'express';
import { beforeEach, describe, expect, it } from 'vitest';
import { Doctor } from '../models/Doctor';
import { Patient } from '../models/Patient';
import { authenticatedAgent, makeApp, seedDoctors } from './helpers';

let app: Express;
beforeEach(() => {
  app = makeApp();
});

const payload = {
  name: 'Dr. Sarah Chen',
  specialization: 'Cardiology',
  hospital: 'Central Hospital',
  phone: '+1 555 123 4567',
  email: 'sarah.chen@test.local',
};

describe('Doctors', () => {
  it('creates a doctor and normalises the email', async () => {
    const agent = await authenticatedAgent(app);
    const res = await agent.post('/api/v1/doctors').send({ ...payload, email: '  Sarah.Chen@Test.Local ' });
    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe(payload.name);
    expect(res.body.data.email).toBe('sarah.chen@test.local');
    expect(res.body.data.patientCount).toBe(0);
  });

  it('accepts multiple free-text specializations and exposes them as tags', async () => {
    const agent = await authenticatedAgent(app);
    const res = await agent.post('/api/v1/doctors').send({
      ...payload,
      specialization: ['Cardiology', 'Internal Medicine', 'Cardiology'],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.specializations).toEqual(['Cardiology', 'Internal Medicine']);
    expect(res.body.data.specialization).toBe('Cardiology');

    const found = await agent.get(`/api/v1/doctors/${res.body.data.id}`);
    expect(found.body.data.specializations).toContain('Internal Medicine');
  });

  it('rejects duplicate emails with 409', async () => {
    const agent = await authenticatedAgent(app);
    await agent.post('/api/v1/doctors').send(payload);
    const res = await agent.post('/api/v1/doctors').send(payload);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('DUPLICATE_KEY');
  });

  it('rejects invalid input with 400', async () => {
    const agent = await authenticatedAgent(app);
    const res = await agent.post('/api/v1/doctors').send({ name: '', email: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toHaveProperty('specialization');
    expect(res.body.error.details).toHaveProperty('email');
  });

  it('paginates at the database level', async () => {
    await seedDoctors(12);
    const agent = await authenticatedAgent(app);
    const page1 = await agent.get('/api/v1/doctors?page=1&limit=5');
    expect(page1.status).toBe(200);
    expect(page1.body.data.data).toHaveLength(5);
    expect(page1.body.data.totalItems).toBe(12);
    expect(page1.body.data.totalPages).toBe(3);
    expect(page1.body.data.currentPage).toBe(1);
    expect(page1.body.data.limit).toBe(5);

    const page3 = await agent.get('/api/v1/doctors?page=3&limit=5');
    expect(page3.body.data.data).toHaveLength(2);
  });

  it('searches across name, email, hospital and specialization', async () => {
    await seedDoctors(5);
    const agent = await authenticatedAgent(app);
    for (const term of ['Doctor 3', 'doctor2@test', 'Hospital 4', 'Dermatology']) {
      const res = await agent.get(`/api/v1/doctors?search=${encodeURIComponent(term)}`);
      expect(res.status).toBe(200);
      expect(res.body.data.totalItems).toBeGreaterThan(0);
    }
  });

  it('filters by specialization and date range', async () => {
    const doctors = await seedDoctors(4);
    // Backdate via the raw collection: Mongoose timestamps would overwrite
    // an explicit createdAt in a normal update.
    await Doctor.collection.updateOne(
      { _id: doctors[0]!._id },
      { $set: { createdAt: new Date('2024-01-15T10:00:00Z') } },
    );
    const agent = await authenticatedAgent(app);

    const bySpec = await agent.get('/api/v1/doctors?specialization=Cardiology');
    expect(bySpec.body.data.totalItems).toBe(2);
    expect(bySpec.body.data.data.every((d: { specialization: string }) => d.specialization === 'Cardiology')).toBe(true);

    const byDate = await agent.get('/api/v1/doctors?startDate=2024-01-01&endDate=2024-01-31');
    expect(byDate.body.data.totalItems).toBe(1);
  });

  it('sorts by an allowed field', async () => {
    await seedDoctors(3);
    const agent = await authenticatedAgent(app);
    const res = await agent.get('/api/v1/doctors?sortBy=name&sortOrder=asc&limit=10');
    const names = res.body.data.data.map((d: { name: string }) => d.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('returns a doctor with its patient count', async () => {
    const agent = await authenticatedAgent(app);
    const created = await agent.post('/api/v1/doctors').send(payload);
    const id = created.body.data.id;
    await Patient.create({ name: 'A', condition: 'Flu', doctorId: id });
    const res = await agent.get(`/api/v1/doctors/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.patientCount).toBe(1);
  });

  it('handles invalid ids and missing records', async () => {
    const agent = await authenticatedAgent(app);
    expect((await agent.get('/api/v1/doctors/not-an-id')).status).toBe(400);
    expect((await agent.get('/api/v1/doctors/64b7f0000000000000000000')).status).toBe(404);
  });

  it('updates a doctor and rejects an empty patch', async () => {
    const agent = await authenticatedAgent(app);
    const created = await agent.post('/api/v1/doctors').send(payload);
    const id = created.body.data.id;
    const res = await agent.patch(`/api/v1/doctors/${id}`).send({ hospital: 'West Hospital' });
    expect(res.status).toBe(200);
    expect(res.body.data.hospital).toBe('West Hospital');
    expect((await agent.patch(`/api/v1/doctors/${id}`).send({})).status).toBe(400);
  });

  it('blocks deletion while patients are assigned, then allows it', async () => {
    const agent = await authenticatedAgent(app);
    const created = await agent.post('/api/v1/doctors').send(payload);
    const id = created.body.data.id;
    const patient = await Patient.create({ name: 'Dependent patient', condition: 'Flu', doctorId: id });

    const blocked = await agent.delete(`/api/v1/doctors/${id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.details.patientCount).toBe(1);
    expect(await Doctor.exists({ _id: id })).toBeTruthy();

    await Patient.findByIdAndDelete(patient._id);
    const ok = await agent.delete(`/api/v1/doctors/${id}`);
    expect(ok.status).toBe(200);
    expect(await Doctor.exists({ _id: id })).toBeFalsy();
  });

  it('lists distinct specializations', async () => {
    await seedDoctors(4);
    const agent = await authenticatedAgent(app);
    const res = await agent.get('/api/v1/doctors/specializations');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(['Cardiology', 'Dermatology']);
  });
});
