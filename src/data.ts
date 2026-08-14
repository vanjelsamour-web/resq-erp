import { Case, Patient } from './types';

export const initialPatients: Patient[] = [
  { id:'RSQ-P-000248', name:'Maria Georgiou', dob:'1988-04-12', phone:'+357 99 123456', email:'maria.georgiou@example.com', status:'Active', lastVisit:'14 Aug 2026' },
  { id:'RSQ-P-000247', name:'Andreas Nicolaou', dob:'1975-09-21', phone:'+357 96 234567', email:'andreas.nicolaou@example.com', status:'Active', lastVisit:'13 Aug 2026' },
  { id:'RSQ-P-000246', name:'Eleni Christou', dob:'1992-02-03', phone:'+357 97 345678', email:'eleni.christou@example.com', status:'Active', lastVisit:'12 Aug 2026' },
  { id:'RSQ-P-000245', name:'Petros Ioannou', dob:'1969-11-18', phone:'+357 99 456789', email:'petros.ioannou@example.com', status:'Inactive', lastVisit:'28 Jul 2026' },
];
export const initialCases: Case[] = [
  { id:'#RSQ-1048', patientId:'RSQ-P-000248', patientName:'Maria Georgiou', type:'Consultation', created:'14 Aug 2026', amount:180, status:'Pending', notes:'Awaiting supporting documents.' },
  { id:'#RSQ-1047', patientId:'RSQ-P-000247', patientName:'Andreas Nicolaou', type:'Follow-up', created:'13 Aug 2026', amount:95, status:'Approved', notes:'Coverage confirmed.' },
  { id:'#RSQ-1046', patientId:'RSQ-P-000246', patientName:'Eleni Christou', type:'Laboratory', created:'12 Aug 2026', amount:420, status:'Under review', notes:'Medical report requested.' },
  { id:'#RSQ-1045', patientId:'RSQ-P-000245', patientName:'Petros Ioannou', type:'Medication', created:'10 Aug 2026', amount:75, status:'Approved', notes:'Eligible under policy.' },
];
export const badge = (s:string) => s==='Approved'||s==='Active'||s==='Completed'||s==='Paid' ? 'approved' : s==='Rejected'||s==='Cancelled'||s==='Overdue' ? 'rejected' : s==='Pending'||s==='Partially paid' ? 'pending' : 'review';
