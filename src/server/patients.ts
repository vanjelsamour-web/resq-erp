import { prisma } from './db';

export async function listPatients(search = '') {
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
  });
}

export async function createPatient(input: {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  phone?: string;
  email?: string;
}) {
  const count = await prisma.patient.count();
  let patientNo = `RSQ-P-${String(count + 1).padStart(6, '0')}`;
  while (await prisma.patient.findUnique({ where: { patientNo } })) {
    patientNo = `RSQ-P-${String(Number(patientNo.slice(-6)) + 1).padStart(6, '0')}`;
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
  });
}

export async function getPatient(id: string) {
  return prisma.patient.findUnique({
    where: { id },
    include: { cases: true, visits: true, invoices: true, payments: true, medications: { include: { medicine: true } } },
  });
}

export async function getPatientByPatientNo(patientNo: string) {
  return prisma.patient.findUnique({
    where: { patientNo },
    include: { cases: true, visits: true, invoices: true, payments: true, medications: { include: { medicine: true } } },
  });
}
