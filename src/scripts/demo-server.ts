/**
 * Local demo bootstrapper: starts an in-memory MongoDB, seeds realistic data
 * and launches the real API server. Used for manual verification and
 * screenshots. Production uses `npm run build && npm start` with MONGODB_URI.
 *
 * All imports are lazy so that MONGODB_URI is set before config/env.ts loads.
 */
async function main() {
  const { MongoMemoryServer } = await import('mongodb-memory-server');
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('doctor_tracker_demo');
  process.env.NODE_ENV ??= 'development';

  const { connectDB } = await import('../db/connect');
  const { createApp } = await import('../app');
  const { Doctor } = await import('../models/Doctor');
  const { Patient } = await import('../models/Patient');
  const { User } = await import('../models/User');
  const { Condition } = await import('../models/Condition');
  const { env } = await import('../config/env');
  const bcrypt = (await import('bcryptjs')).default;

  await connectDB();

  const adminEmail = process.env.ADMIN_EMAIL ?? 'admin@doctortracker.local';
  const adminPassword = process.env.ADMIN_PASSWORD ?? process.env.DEMO_ADMIN_PASSWORD;
  if (!adminPassword) {
    throw new Error('Set ADMIN_PASSWORD (or DEMO_ADMIN_PASSWORD) before running the demo server');
  }
  await User.create({
    name: process.env.ADMIN_NAME ?? 'Dr. Alex Morgan',
    email: adminEmail,
    password: await bcrypt.hash(adminPassword, 10),
    role: 'admin',
  });

  const specialties = [
    [['Cardiology', 'Internal Medicine'], 'Dr. Sarah Chen', 'Central General Hospital'],
    [['Dermatology'], 'Dr. Marcus Rivera', 'St. Mary Medical Center'],
    [['Pediatrics', 'Neonatology'], 'Dr. Emily Carter', 'Children’s Health Clinic'],
    [['Neurology'], 'Dr. James Okafor', 'University Hospital'],
    [['Orthopedics', 'Sports Medicine'], 'Dr. Olivia Bennett', 'Riverside Medical Center'],
    [['General Practice'], 'Dr. Daniel Kim', 'Northside Family Clinic'],
  ] as const;
  const doctors = await Doctor.insertMany(
    specialties.map(([specialization, name, hospital], i) => ({
      name,
      specialization: [...specialization],
      hospital,
      phone: `+1 555 ${String(201 + i)} ${String(1000 + i * 37)}`,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@clinic.local`,
    })),
  );

  const conditions = ['Hypertension', 'Diabetes', 'Asthma', 'Migraine', 'Arthritis', 'Routine checkup'];
  const firstNames = ['Ava', 'Noah', 'Mia', 'Liam', 'Zoe', 'Ethan', 'Isla', 'Leo', 'Nora', 'Kai', 'Ruby', 'Owen'];
  const lastNames = ['Walker', 'Patel', 'Thompson', 'Nguyen', 'Garcia', 'Robinson', 'Clark', 'Hall', 'Young', 'King', 'Wright', 'Lewis'];
  const patients = Array.from({ length: 42 }, (_, i) => {
    const first = firstNames[i % firstNames.length]!;
    const last = lastNames[(i * 5 + 2) % lastNames.length]!;
    return {
      name: `${first} ${last}`,
      age: 18 + ((i * 7) % 60),
      gender: (['female', 'male', 'other'] as const)[i % 3],
      email: i % 4 !== 0 ? `${first.toLowerCase()}.${last.toLowerCase()}@example.com` : undefined,
      phone: i % 5 !== 0 ? `+1 555 ${String(300 + (i % 100)).slice(-3)} ${String(8000 + i * 11).slice(-4)}` : undefined,
      condition: conditions[i % conditions.length]!,
      doctorId: doctors[i % doctors.length]!._id,
      notes: 'Routine follow-up scheduled.',
    };
  });
  await Patient.insertMany(patients);

  // Seed the managed condition catalog from the same values used above.
  await Condition.insertMany(
    conditions.map((name) => ({ name, key: name.toLowerCase() })),
  );

  // Backdate records for meaningful trend charts (raw collection bypasses
  // Mongoose timestamps so createdAt is preserved).
  const now = Date.now();
  for (const [i, doctor] of doctors.entries()) {
    await Doctor.collection.updateOne(
      { _id: doctor._id },
      { $set: { createdAt: new Date(now - (30 - i * 4) * 86400000) } },
    );
  }
  for (const [i, patient] of patients.entries()) {
    const created = await Patient.findOne({ name: patient.name, condition: patient.condition }).lean();
    if (created) {
      await Patient.collection.updateOne(
        { _id: created._id },
        { $set: { createdAt: new Date(now - (i * 2 + 1) * 86400000) } },
      );
    }
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[demo] API listening on http://localhost:${env.PORT}`);
    console.log(`[demo] Admin login: ${adminEmail} / ${adminPassword}`);
  });

  const shutdown = () => server.close(async () => { await mongo.stop(); process.exit(0); });
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('[demo] Failed to start:', error);
  process.exit(1);
});
