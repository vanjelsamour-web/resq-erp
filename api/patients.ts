import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createPatient, getPatient, listPatients } from '../src/server/patients';

function toUiPatient(patient: any) {
  const lastVisit = patient.visits?.length
    ? [...patient.visits].sort((a: any, b: any) => +new Date(b.scheduledAt) - +new Date(a.scheduledAt))[0]
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method === 'GET') {
      const search = typeof req.query.search === 'string' ? req.query.search : '';
      const id = typeof req.query.id === 'string' ? req.query.id : '';
      if (id) {
        const patient = await getPatient(id);
        if (!patient) return res.status(404).json({ error: 'Patient not found' });
        return res.status(200).json({ ...toUiPatient(patient), history: {
          cases: patient.cases,
          visits: patient.visits,
          invoices: patient.invoices,
          payments: patient.payments,
          medications: patient.medications,
        }});
      }
      const patients = await listPatients(search);
      return res.status(200).json(patients.map(toUiPatient));
    }

    if (req.method === 'POST') {
      const body = req.body ?? {};
      const name = String(body.name ?? '').trim();
      if (!name) return res.status(400).json({ error: 'Full name is required' });

      const parts = name.split(/\s+/);
      const firstName = parts.shift() ?? '';
      const lastName = parts.join(' ') || firstName;
      const patient = await createPatient({
        firstName,
        lastName,
        dateOfBirth: body.dob ? new Date(body.dob) : undefined,
        phone: body.phone ? String(body.phone) : undefined,
        email: body.email ? String(body.email) : undefined,
      });

      return res.status(201).json(toUiPatient(patient));
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Patients API error', error);
    return res.status(500).json({ error: 'Unable to process patient request' });
  }
}
