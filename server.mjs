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
  const lastVisit = patient.visits?.length ? [...patient.visits].sort((a, b) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt))[0] : null;
  return { id: patient.patientNo, name: `${patient.firstName} ${patient.lastName}`.trim(), dob: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().slice(0, 10) : '', phone: patient.phone ?? '', email: patient.email ?? '', status: patient.status === 'ACTIVE' ? 'Active' : 'Inactive', lastVisit: lastVisit ? new Date(lastVisit.scheduledAt).toISOString().slice(0, 10) : '—', databaseId: patient.id };
}

function toUiCase(record) {
  const statusMap = { PENDING: 'Pending', UNDER_REVIEW: 'Under review', APPROVED: 'Approved', REJECTED: 'Rejected' };
  return { id: record.caseNo, patientId: record.patient.patientNo, patientName: `${record.patient.firstName} ${record.patient.lastName}`.trim(), type: record.type, created: new Date(record.createdAt).toISOString().slice(0, 10), amount: Number(record.amount), status: statusMap[record.status] ?? 'Pending', notes: record.notes ?? 'No notes added.', databaseId: record.id, decisionAmount: record.decisionAmount == null ? null : Number(record.decisionAmount) };
}

function toUiVisit(record) {
  const statusMap = { SCHEDULED: 'Scheduled', COMPLETED: 'Completed', CANCELLED: 'Cancelled' };
  const scheduled = new Date(record.scheduledAt);
  return { id: record.visitNo, patientId: record.patient.patientNo, patientName: `${record.patient.firstName} ${record.patient.lastName}`.trim(), date: scheduled.toISOString().slice(0, 10), time: scheduled.toISOString().slice(11, 16), type: record.type, practitioner: record.practitioner ?? 'Not assigned', notes: record.notes ?? 'No notes added.', outcome: statusMap[record.status] ?? 'Scheduled', databaseId: record.id, caseId: record.case?.caseNo ?? null };
}

function toUiInvoice(record) {
  const statusMap = { DRAFT: 'Draft', ISSUED: 'Issued', PARTIALLY_PAID: 'Partially paid', PAID: 'Paid', OVERDUE: 'Overdue' };
  const paid = (record.payments ?? []).filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + Number(p.amount), 0);
  return { id: record.invoiceNo, patientId: record.patient.patientNo, patientName: `${record.patient.firstName} ${record.patient.lastName}`.trim(), caseId: record.case?.caseNo ?? null, date: new Date(record.issueDate).toISOString().slice(0, 10), dueDate: new Date(record.dueDate).toISOString().slice(0, 10), amount: Number(record.amount), paid, status: statusMap[record.status] ?? 'Issued', databaseId: record.id };
}

function statusFromUi(status) { return { Pending: 'PENDING', 'Under review': 'UNDER_REVIEW', Approved: 'APPROVED', Rejected: 'REJECTED' }[status]; }
function visitStatusFromUi(status) { return { Scheduled: 'SCHEDULED', Completed: 'COMPLETED', Cancelled: 'CANCELLED' }[status]; }
function invoiceStatusFromUi(status) { return { Draft: 'DRAFT', Issued: 'ISSUED', 'Partially paid': 'PARTIALLY_PAID', Paid: 'PAID', Overdue: 'OVERDUE' }[status]; }
function paymentMethodFromUi(method) { return { 'Bank transfer': 'BANK_TRANSFER', Card: 'CARD', Cash: 'CASH' }[method]; }

async function listPatients(search = '') {
  const q = search.trim();
  return prisma.patient.findMany({ where: q ? { OR: [{ patientNo: { contains: q, mode: 'insensitive' } }, { firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }, { phone: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }] } : undefined, orderBy: { createdAt: 'desc' }, include: { visits: true } });
}

async function getPatientByPatientNo(patientNo) {
  return prisma.patient.findUnique({ where: { patientNo }, include: { cases: true, visits: true, invoices: true, payments: true, medications: { include: { medicine: true } } } });
}

async function createPatient(input) {
  const count = await prisma.patient.count();
  let number = count + 1;
  let patientNo = `RSQ-P-${String(number).padStart(6, '0')}`;
  while (await prisma.patient.findUnique({ where: { patientNo } })) { number += 1; patientNo = `RSQ-P-${String(number).padStart(6, '0')}`; }
  return prisma.patient.create({ data: { patientNo, firstName: input.firstName, lastName: input.lastName, dateOfBirth: input.dateOfBirth, phone: input.phone, email: input.email }, include: { visits: true } });
}

async function listCases(patientNo = '') {
  return prisma.case.findMany({ where: patientNo ? { patient: { patientNo } } : undefined, orderBy: { createdAt: 'desc' }, include: { patient: true } });
}

async function createCase(input) {
  const count = await prisma.case.count();
  let number = count + 1;
  let caseNo = `RSQ-C-${String(number).padStart(6, '0')}`;
  while (await prisma.case.findUnique({ where: { caseNo } })) { number += 1; caseNo = `RSQ-C-${String(number).padStart(6, '0')}`; }
  const patient = await prisma.patient.findUnique({ where: { patientNo: input.patientId } });
  if (!patient) throw new Error('Patient not found');
  return prisma.case.create({ data: { caseNo, patientId: patient.id, type: input.type, amount: Number(input.amount), notes: input.notes || null }, include: { patient: true } });
}

async function listVisits() { return prisma.visit.findMany({ orderBy: { scheduledAt: 'desc' }, include: { patient: true, case: true } }); }

async function createVisit(input) {
  const count = await prisma.visit.count();
  let number = count + 1;
  let visitNo = `RSQ-V-${String(number).padStart(6, '0')}`;
  while (await prisma.visit.findUnique({ where: { visitNo } })) { number += 1; visitNo = `RSQ-V-${String(number).padStart(6, '0')}`; }
  const patient = await prisma.patient.findUnique({ where: { patientNo: input.patientId } });
  if (!patient) throw new Error('Patient not found');
  let caseId;
  if (input.caseId) {
    const record = await prisma.case.findUnique({ where: { caseNo: input.caseId } });
    if (!record) throw new Error('Case not found');
    if (record.patientId !== patient.id) throw new Error('Case does not belong to selected patient');
    caseId = record.id;
  }
  return prisma.visit.create({ data: { visitNo, patientId: patient.id, caseId, scheduledAt: new Date(input.scheduledAt), type: input.type, practitioner: input.practitioner || null, notes: input.notes || null }, include: { patient: true, case: true } });
}

async function nextNumber(model, prefix, field, pad = 6) {
  const count = await model.count();
  let number = count + 1;
  let value = `${prefix}-${String(number).padStart(pad, '0')}`;
  while (await model.findUnique({ where: { [field]: value } })) { number += 1; value = `${prefix}-${String(number).padStart(pad, '0')}`; }
  return value;
}

app.get('/api/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ ok: true, database: 'connected' }); }
  catch (error) { console.error('Health check failed', error); res.status(503).json({ ok: false, database: 'unavailable' }); }
});

app.get('/api/patients', async (req, res) => {
  try {
    const patientNo = typeof req.query.id === 'string' ? req.query.id : '';
    if (patientNo) {
      const patient = await getPatientByPatientNo(patientNo);
      if (!patient) return res.status(404).json({ error: 'Patient not found' });
      return res.json({ ...toUiPatient(patient), history: { cases: patient.cases, visits: patient.visits, invoices: patient.invoices, payments: patient.payments, medications: patient.medications } });
    }
    const search = typeof req.query.search === 'string' ? req.query.search : '';
    res.json((await listPatients(search)).map(toUiPatient));
  } catch (error) { console.error('Patients GET error', error); res.status(500).json({ error: 'Unable to load patients' }); }
});

app.post('/api/patients', async (req, res) => {
  try {
    const name = String(req.body?.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Full name is required' });
    const parts = name.split(/\s+/);
    const patient = await createPatient({ firstName: parts.shift() ?? '', lastName: parts.join(' ') || name, dateOfBirth: req.body?.dob ? new Date(req.body.dob) : undefined, phone: req.body?.phone ? String(req.body.phone) : undefined, email: req.body?.email ? String(req.body.email) : undefined });
    res.status(201).json(toUiPatient(patient));
  } catch (error) { console.error('Patients POST error', error); res.status(500).json({ error: 'Unable to create patient' }); }
});

app.get('/api/cases', async (req, res) => {
  try { const patientNo = typeof req.query.patientId === 'string' ? req.query.patientId : ''; res.json((await listCases(patientNo)).map(toUiCase)); }
  catch (error) { console.error('Cases GET error', error); res.status(500).json({ error: 'Unable to load cases' }); }
});

app.post('/api/cases', async (req, res) => {
  try {
    const patientId = String(req.body?.patientId ?? '').trim(); const type = String(req.body?.type ?? '').trim(); const amount = Number(req.body?.amount);
    if (!patientId || !type || !Number.isFinite(amount) || amount < 0) return res.status(400).json({ error: 'Patient, case type and a valid amount are required' });
    res.status(201).json(toUiCase(await createCase({ patientId, type, amount, notes: String(req.body?.notes ?? '').trim() })));
  } catch (error) { console.error('Cases POST error', error); res.status(error instanceof Error && error.message === 'Patient not found' ? 404 : 500).json({ error: error instanceof Error ? error.message : 'Unable to create case' }); }
});

app.patch('/api/cases/:id/status', async (req, res) => {
  try {
    const status = statusFromUi(String(req.body?.status ?? '')); if (!status) return res.status(400).json({ error: 'Invalid case status' });
    const record = await prisma.case.findUnique({ where: { caseNo: req.params.id }, include: { patient: true } }); if (!record) return res.status(404).json({ error: 'Case not found' });
    const decisionAmount = status === 'APPROVED' ? Number(req.body?.decisionAmount ?? record.amount) : undefined;
    const updated = await prisma.case.update({ where: { id: record.id }, data: { status, ...(decisionAmount !== undefined ? { decisionAmount } : {}) }, include: { patient: true } });
    res.json(toUiCase(updated));
  } catch (error) { console.error('Cases status PATCH error', error); res.status(500).json({ error: 'Unable to update case status' }); }
});

app.get('/api/visits', async (_req, res) => { try { res.json((await listVisits()).map(toUiVisit)); } catch (error) { console.error('Visits GET error', error); res.status(500).json({ error: 'Unable to load visits' }); } });

app.post('/api/visits', async (req, res) => {
  try {
    const patientId = String(req.body?.patientId ?? '').trim(); const type = String(req.body?.type ?? '').trim(); const scheduledAt = String(req.body?.scheduledAt ?? '').trim();
    if (!patientId || !type || !scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) return res.status(400).json({ error: 'Patient, visit type and a valid date/time are required' });
    res.status(201).json(toUiVisit(await createVisit({ patientId, caseId: req.body?.caseId ? String(req.body.caseId).trim() : '', scheduledAt, type, practitioner: String(req.body?.practitioner ?? '').trim(), notes: String(req.body?.notes ?? '').trim() })));
  } catch (error) { console.error('Visits POST error', error); res.status(error instanceof Error && (error.message === 'Patient not found' || error.message === 'Case not found') ? 404 : 400).json({ error: error instanceof Error ? error.message : 'Unable to create visit' }); }
});

app.patch('/api/visits/:id/status', async (req, res) => {
  try {
    const status = visitStatusFromUi(String(req.body?.status ?? '')); if (!status) return res.status(400).json({ error: 'Invalid visit status' });
    const record = await prisma.visit.findUnique({ where: { visitNo: req.params.id }, include: { patient: true, case: true } }); if (!record) return res.status(404).json({ error: 'Visit not found' });
    const updated = await prisma.visit.update({ where: { id: record.id }, data: { status }, include: { patient: true, case: true } }); res.json(toUiVisit(updated));
  } catch (error) { console.error('Visits status PATCH error', error); res.status(500).json({ error: 'Unable to update visit status' }); }
});

app.get('/api/invoices', async (_req, res) => {
  try {
    const records = await prisma.invoice.findMany({ orderBy: { issueDate: 'desc' }, include: { patient: true, case: true, payments: true } });
    res.json(records.map(toUiInvoice));
  } catch (error) { console.error('Invoices GET error', error); res.status(500).json({ error: 'Unable to load invoices' }); }
});

app.post('/api/invoices', async (req, res) => {
  try {
    const patientNo = String(req.body?.patientId ?? '').trim(); const caseNo = String(req.body?.caseId ?? '').trim(); const amount = Number(req.body?.amount);
    const dueDate = new Date(String(req.body?.dueDate ?? ''));
    if (!patientNo || !Number.isFinite(amount) || amount < 0 || Number.isNaN(dueDate.getTime())) return res.status(400).json({ error: 'Patient, valid amount and due date are required' });
    const patient = await prisma.patient.findUnique({ where: { patientNo } }); if (!patient) return res.status(404).json({ error: 'Patient not found' });
    let caseId = null;
    if (caseNo) { const record = await prisma.case.findUnique({ where: { caseNo } }); if (!record) return res.status(404).json({ error: 'Case not found' }); if (record.patientId !== patient.id) return res.status(400).json({ error: 'Case does not belong to selected patient' }); caseId = record.id; }
    const invoiceNo = await nextNumber(prisma.invoice, `INV-${new Date().getFullYear()}`, 'invoiceNo', 6);
    const created = await prisma.invoice.create({ data: { invoiceNo, patientId: patient.id, caseId, dueDate, amount, status: 'ISSUED' }, include: { patient: true, case: true, payments: true } });
    res.status(201).json(toUiInvoice(created));
  } catch (error) { console.error('Invoices POST error', error); res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to create invoice' }); }
});

app.patch('/api/invoices/:id/status', async (req, res) => {
  try {
    const status = invoiceStatusFromUi(String(req.body?.status ?? '')); if (!status) return res.status(400).json({ error: 'Invalid invoice status' });
    const record = await prisma.invoice.findUnique({ where: { invoiceNo: req.params.id } }); if (!record) return res.status(404).json({ error: 'Invoice not found' });
    const updated = await prisma.invoice.update({ where: { id: record.id }, data: { status }, include: { patient: true, case: true, payments: true } }); res.json(toUiInvoice(updated));
  } catch (error) { console.error('Invoice status PATCH error', error); res.status(500).json({ error: 'Unable to update invoice status' }); }
});

app.post('/api/invoices/:id/payments', async (req, res) => {
  try {
    const amount = Number(req.body?.amount); const method = paymentMethodFromUi(String(req.body?.method ?? '')); const reference = String(req.body?.reference ?? '').trim();
    if (!Number.isFinite(amount) || amount <= 0 || !method) return res.status(400).json({ error: 'Valid amount and payment method are required' });
    const invoice = await prisma.invoice.findUnique({ where: { invoiceNo: req.params.id }, include: { payments: true } }); if (!invoice) return res.status(404).json({ error: 'Invoice not found' });
    const completedPaid = invoice.payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + Number(p.amount), 0);
    const balance = Number(invoice.amount) - completedPaid;
    if (amount > balance) return res.status(400).json({ error: `Payment exceeds outstanding balance of €${balance.toFixed(2)}` });
    const paymentNo = await nextNumber(prisma.payment, 'PAY', 'paymentNo', 6);
    await prisma.payment.create({ data: { paymentNo, invoiceId: invoice.id, patientId: invoice.patientId, amount, method, reference: reference || null, status: 'COMPLETED' } });
    const newPaid = completedPaid + amount;
    const status = newPaid >= Number(invoice.amount) ? 'PAID' : 'PARTIALLY_PAID';
    const updated = await prisma.invoice.update({ where: { id: invoice.id }, data: { status }, include: { patient: true, case: true, payments: true } });
    res.status(201).json(toUiInvoice(updated));
  } catch (error) { console.error('Invoice payment POST error', error); res.status(500).json({ error: error instanceof Error ? error.message : 'Unable to record payment' }); }
});

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('/{*splat}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
const server = app.listen(port, () => console.log(`RESQ ERP server listening on port ${port}`));
async function shutdown(signal) { console.log(`${signal} received, shutting down`); server.close(async () => { await prisma.$disconnect(); process.exit(0); }); }
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));