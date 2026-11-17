import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../app';
import { TEST_ADMIN } from './setup';

export function makeApp(): Express {
  return createApp();
}

/** Log in and return a supertest agent whose cookie jar holds the session. */
export async function authenticatedAgent(app: Express) {
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/login').send({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password,
  });
  if (response.status !== 200) {
    throw new Error(`Test login failed: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return agent;
}

export async function seedDoctors(count: number) {
  const { Doctor } = await import('../models/Doctor');
  const docs = Array.from({ length: count }, (_, i) => ({
    name: `Doctor ${i + 1}`,
    specialization: i % 2 === 0 ? 'Cardiology' : 'Dermatology',
    hospital: `Hospital ${i + 1}`,
    phone: `555-000${i}`,
    email: `doctor${i + 1}@test.local`,
  }));
  return Doctor.insertMany(docs);
}

export async function seedPatients(count: number, doctorId: string) {
  const { Patient } = await import('../models/Patient');
  const docs = Array.from({ length: count }, (_, i) => ({
    name: `Patient ${i + 1}`,
    condition: i % 2 === 0 ? 'Hypertension' : 'Diabetes',
    doctorId,
    age: 20 + i,
  }));
  return Patient.insertMany(docs);
}
