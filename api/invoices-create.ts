import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function nextInvoiceNumber() {
  let n = (await prisma.invoice.count()) + 1;
  let value = `INV-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
  while (await prisma.invoice.findUnique({ where: { invoiceNo: value } })) {
    n += 1;
    value = `INV-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`;
  }
  return value;
}

function patientName(p: { firstName: string; lastName: string }) {
  return `${p.firstName} ${p.lastName}`.trim();
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const patientNo = String(req.body?.patientId ?? '').trim();
    const caseNo = String(req.body?.caseId ?? '').trim();
    const amount = Number(req.body?.amount);
    const discount = Number(req.body?.discountAmount ?? 0);
    const vatRate = Number(req.body?.vatRate ?? 0);
    const type = String(req.body?.type ?? 'CREDIT') === 'CASH' ? 'CASH' : 'CREDIT';
    const dueDate = new Date(String(req.body?.dueDate ?? ''));

    if (!patientNo || !Number.isFinite(amount) || amount <= 0 || !Number.isFinite(discount) || discount < 0 || !Number.isFinite(vatRate) || vatRate < 0 || Number.isNaN(dueDate.getTime())) {
      return res.status(400).json({ error: 'Patient, valid amount and due date are required' });
    }

    const patient = await prisma.patient.findUnique({ where: { patientNo } });
    if (!patient) return res.status(404).json({ error: 'Patient not found' });
    if (patient.status !== 'ACTIVE') return res.status(400).json({ error: 'Inactive patients cannot be invoiced' });

    let caseId: string | null = null;
    if (caseNo) {
      const c = await prisma.case.findUnique({ where: { caseNo } });
      if (!c || c.patientId !== patient.id) return res.status(400).json({ error: 'Case does not belong to selected patient' });
      caseId = c.id;
    }

    const grossAmount = Number((amount + discount).toFixed(2));
    const vatAmount = Number((amount * vatRate / (100 + vatRate)).toFixed(2));
    const netAmount = Number((amount - vatAmount).toFixed(2));
    const invoiceNo = await nextInvoiceNumber();
    const notes = discount > 0 ? `Discount: €${discount.toFixed(2)}` : null;

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNo,
        patientId: patient.id,
        caseId,
        dueDate,
        amount,
        netAmount,
        vatRate,
        vatAmount,
        type,
        status: 'ISSUED',
        notes,
      },
      include: { patient: true, case: true, payments: true },
    });

    return res.status(201).json({
      id: invoice.invoiceNo,
      patientId: invoice.patient.patientNo,
      patientName: patientName(invoice.patient),
      caseId: invoice.case?.caseNo ?? null,
      date: invoice.issueDate.toISOString().slice(0, 10),
      dueDate: invoice.dueDate.toISOString().slice(0, 10),
      amount: Number(invoice.amount),
      netAmount: Number(invoice.netAmount),
      vatRate: Number(invoice.vatRate),
      vatAmount: Number(invoice.vatAmount),
      paid: 0,
      status: 'Issued',
      type: invoice.type,
      discountAmount: discount,
      grossAmount,
    });
  } catch (error) {
    console.error('Invoice creation error', error);
    return res.status(500).json({ error: 'Unable to create invoice' });
  }
}
