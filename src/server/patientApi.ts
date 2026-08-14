import { createPatient, getPatient, listPatients } from './patients';

export async function patientApi(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === 'GET' && url.pathname === '/api/patients') {
    return Response.json(await listPatients(url.searchParams.get('search') ?? ''));
  }
  if (request.method === 'GET' && url.pathname.startsWith('/api/patients/')) {
    const id = url.pathname.split('/').pop();
    if (!id) return Response.json({ error: 'Patient id is required' }, { status: 400 });
    const patient = await getPatient(id);
    return patient ? Response.json(patient) : Response.json({ error: 'Patient not found' }, { status: 404 });
  }
  if (request.method === 'POST' && url.pathname === '/api/patients') {
    const body = await request.json();
    if (!body.firstName || !body.lastName) return Response.json({ error: 'First name and last name are required' }, { status: 400 });
    const patient = await createPatient(body);
    return Response.json(patient, { status: 201 });
  }
  return Response.json({ error: 'Not found' }, { status: 404 });
}
