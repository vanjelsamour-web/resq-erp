import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const prisma = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

async function ensurePatientExtraFields() {
  await prisma.$executeRawUnsafe(`ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "identityNumber" VARCHAR(100)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "nextOfKinName" VARCHAR(200)`);
  await prisma.$executeRawUnsafe(`ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "nextOfKinPhone" VARCHAR(30)`);
}

function toUiPatient(patient: any, extra: any = {}) {
  const lastVisit = patient.visits?.length ? [...patient.visits].sort((a: any, b: any) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt))[0] : null;
  return {
    id: patient.patientNo,
    name: `${patient.firstName} ${patient.lastName}`.trim(),
    dob: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().slice(0, 10) : '',
    phone: patient.phone ?? '', email: patient.email ?? '',
    identityNumber: extra.identityNumber ?? '', nextOfKinName: extra.nextOfKinName ?? '', nextOfKinPhone: extra.nextOfKinPhone ?? '',
    notes: patient.notes ?? '', status: patient.status === 'ACTIVE' ? 'Active' : 'Inactive',
    lastVisit: lastVisit ? new Date(lastVisit.scheduledAt).toISOString().slice(0, 10) : '—', databaseId: patient.id,
  };
}
function parseName(name: unknown) { const value = String(name ?? '').trim(); const parts = value.split(/\s+/).filter(Boolean); const firstName = parts.shift() ?? ''; return { firstName, lastName: parts.join(' ') || firstName }; }
const patientInclude = { cases: true, visits: true, invoices: true, payments: true, medications: { include: { medicine: true } } };
async function getExtraFields(patientId: string) { const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT "identityNumber", "nextOfKinName", "nextOfKinPhone" FROM "Patient" WHERE "id" = $1`, patientId); return rows[0] ?? {}; }
async function listPatients(search = '', status: 'ACTIVE' | 'INACTIVE' | 'ALL' = 'ACTIVE') {
  const q = search.trim(); const statusFilter = status !== 'ALL' ? { status } : {};
  return prisma.patient.findMany({ where: { ...statusFilter, ...(q ? { OR: [{ patientNo: { contains: q, mode: 'insensitive' } }, { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : {}) }, orderBy: { createdAt: 'desc' }, include: { visits: true } });
}
async function getPatientByPatientNo(patientNo: string) { return prisma.patient.findUnique({ where: { patientNo }, include: patientInclude }); }
async function createPatient(input: any) {
  const count = await prisma.patient.count(); let patientNo = `RSQ-P-${String(count + 1).padStart(6, '0')}`;
  while (await prisma.patient.findUnique({ where: { patientNo } })) patientNo = `RSQ-P-${String(Number(patientNo.slice(-6)) + 1).padStart(6, '0')}`;
  const patient = await prisma.patient.create({ data: { patientNo, firstName: input.firstName, lastName: input.lastName, dateOfBirth: input.dateOfBirth, phone: input.phone, email: input.email, notes: input.notes } });
  await prisma.$executeRawUnsafe(`UPDATE "Patient" SET "identityNumber"=$1,"nextOfKinName"=$2,"nextOfKinPhone"=$3 WHERE "id"=$4`, input.identityNumber || null, input.nextOfKinName || null, input.nextOfKinPhone || null, patient.id);
  return patient;
}
export default async function handler(req: any, res: any) {
  try {
    await ensurePatientExtraFields();
    if (req.method === 'GET') {
      const search = typeof req.query?.search === 'string' ? req.query.search : ''; const patientNo = typeof req.query?.id === 'string' ? req.query.id : '';
      const statusRaw = typeof req.query?.status === 'string' ? req.query.status.toUpperCase() : 'ACTIVE'; const status: 'ACTIVE'|'INACTIVE'|'ALL' = statusRaw === 'ALL' ? 'ALL' : statusRaw === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE';
      if (patientNo) { const patient = await getPatientByPatientNo(patientNo); if (!patient) return res.status(404).json({ error: 'Patient not found' }); return res.status(200).json({ ...toUiPatient(patient, await getExtraFields(patient.id)), history: { cases: patient.cases, visits: patient.visits, invoices: patient.invoices, payments: patient.payments, medications: patient.medications } }); }
      const patients = await listPatients(search, status); const extras = await Promise.all(patients.map((p: any) => getExtraFields(p.id))); return res.status(200).json(patients.map((p: any, i: number) => toUiPatient(p, extras[i])));
    }
    if (req.method === 'POST') {
      const body = req.body ?? {}; const name = String(body.name ?? '').trim(); if (!name) return res.status(400).json({ error: 'Full name is required' }); const { firstName, lastName } = parseName(name);
      const patient = await createPatient({ firstName, lastName, dateOfBirth: body.dob ? new Date(body.dob) : undefined, phone: body.phone ? String(body.phone) : undefined, email: body.email ? String(body.email) : undefined, identityNumber: body.identityNumber ? String(body.identityNumber) : undefined, nextOfKinName: body.nextOfKinName ? String(body.nextOfKinName) : undefined, nextOfKinPhone: body.nextOfKinPhone ? String(body.nextOfKinPhone) : undefined, notes: body.notes ? String(body.notes) : undefined });
      return res.status(201).json(toUiPatient(patient, await getExtraFields(patient.id)));
    }
    if (req.method === 'PATCH') {
      const patientNo = typeof req.query?.id === 'string' ? req.query.id : ''; if (!patientNo) return res.status(400).json({ error: 'Patient ID is required' }); const body = req.body ?? {};
      if (body.status === 'ACTIVE' || body.status === 'INACTIVE') { const patient = await prisma.patient.update({ where: { patientNo }, data: { status: body.status } }); return res.status(200).json(toUiPatient(patient, await getExtraFields(patient.id))); }
      const name = String(body.name ?? '').trim(); if (!name) return res.status(400).json({ error: 'Full name is required' }); const { firstName, lastName } = parseName(name);
      const patient = await prisma.patient.update({ where: { patientNo }, data: { firstName, lastName, dateOfBirth: body.dob ? new Date(body.dob) : null, phone: body.phone ? String(body.phone) : null, email: body.email ? String(body.email) : null, notes: body.notes ? String(body.notes) : null } });
      await prisma.$executeRawUnsafe(`UPDATE "Patient" SET "identityNumber"=$1,"nextOfKinName"=$2,"nextOfKinPhone"=$3 WHERE "id"=$4`, body.identityNumber ? String(body.identityNumber) : null, body.nextOfKinName ? String(body.nextOfKinName) : null, body.nextOfKinPhone ? String(body.nextOfKinPhone) : null, patient.id);
      return res.status(200).json(toUiPatient(patient, await getExtraFields(patient.id)));
    }
    res.setHeader('Allow', 'GET, POST, PATCH'); return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) { console.error('Patients API error', error); return res.status(500).json({ error: 'Unable to process patient request' }); }
}
