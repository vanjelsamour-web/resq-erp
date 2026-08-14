import { prisma } from './db';

export async function listPatients(search = '') {
  const q = search.trim();
  return prisma.patient.findMany({
    where: q ? {
      OR: [
        { patientId: { contains: q, mode: 'insensitive' } },
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
  const patientId = `RSQ-P-${String(count + 1).padStart(6, '0')}`;
  return prisma.patient.create({
    data: {
      patientId,
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
    include: { cases: true, visits: true, invoices: true, medicines: true },
  });
}
