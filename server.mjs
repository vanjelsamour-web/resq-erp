import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '1mb' }));

function toUiPatient(patient) {
  const lastVisit = patient.visits?.length
    ? [...patient.visits].sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt))[0]
    : null;

  return {
    id: patient.patientNo,
    name: `${patient.firstName} ${patient.lastName}`.trim(),
    dob: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().slice(0, 10) : '',
    phone: patient.phone ?? '',
    email: patient.email ?? '',
    status: patient.status === 'ACTIVE' ? 'Active' : 'Inactive',
    lastVisit: lastVisit ? new Date(lastVisit.scheduledAt).toISOString().slice(0, 10) : '—',
    databaseId: patient.id,
  };
}

async function listPatients(search = '') {
  const q = search.trim();
  return prisma.patient.findMany({
    where: q ? {
      OR: [
        { patientNo: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
      ],
    } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { visits: true },
  });
}

async function getPatientByPatientNo(patientNo) {
  return prisma.patient.findUnique({
    where: { patientNo },
    include: {
      cases: true,
      visits: true,
      invoices: true,
      payments: true,
      medications: { include: { medicine: true } },
    },
  });
}

async function createPatient(input) {
  const count = await prisma.patient.count();
  let number = count + 1;
  let patientNo = `RSQ-P-${String(number).padStart(6, '0')}`;
  while (await prisma.patient.findUnique({ where: { patientNo } })) {
    number += 1;
    patientNo = `RSQ-P-${String(number).padStart(6, '0')}`;
  }

  return prisma.patient.create({
    data: {
      patientNo,
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      phone: input.phone,
      email: input.email,
    },
    include: { visits: true },
  });
}

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, database: 'connected' });
  } catch (error) {
    console.error('Health check failed', error);
    res.status(503).json({ ok: false, database: 'unavailable' });
  }
});

app.get('/api/patients', async (req, res) => {
  try {
    const patientNo = typeof req.query.id === 'string' ? req.query.id : '';
    if (patientNo) {
      const patient = await getPatientByPatientNo(patientNo);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      return res.json({ ...toUiPatient(patient), history: {
        cases: patient.cases,
        visits: patient.visits,
        invoices: patient.invoices,
        payments: patient.payments,
        medications: patient.medications,
      }});
    }

    const search = typeof req.query.search === 'string' ? req.query.search : '';
    const patients = await listPatients(search);
    res.json(patients.map(toUiPatient));
  } catch (error) {
    console.error('Patients GET error', error);
    res.status(500).json({ error: 'Unable to load patients' });
  }
});

app.post('/api/patients', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Full name is required' });

    const parts = name.split(/\s+/);
    const firstName = parts.shift() ?? '';
    const lastName = parts.join(' ') || firstName;
    const patient = await createPatient({
      firstName,
      lastName,
      dateOfBirth: req.body?.dob ? new Date(req.body.dob) : undefined,
      phone: req.body?.phone ? String(req.body.phone) : undefined,
      email: req.body?.email ? String(req.body.email) : undefined,
    });

    res.status(201).json(toUiPatient(patient));
  } catch (error) {
    console.error('Patients POST error', error);
    res.status(500).json({ error: 'Unable to create patient' });
  }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('/{*splat}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));

const server = app.listen(port, () => {
  console.log(`RESQ ERP server listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
