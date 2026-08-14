import React, { useMemo, useState } from 'react';
import { CalendarDays, Clock, FileText, Plus, Search, UserRound, X } from 'lucide-react';

type Visit = {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  type: string;
  practitioner: string;
  notes: string;
  outcome: 'Completed' | 'Scheduled' | 'Cancelled';
};

const initialVisits: Visit[] = [
  { id: 'VIS-00241', patientId: 'RSQ-P-000248', patientName: 'Maria Georgiou', date: '14 Aug 2026', time: '09:30', type: 'Consultation', practitioner: 'Dr. A. Demetriou', notes: 'Initial consultation and assessment.', outcome: 'Completed' },
  { id: 'VIS-00240', patientId: 'RSQ-P-000247', patientName: 'Andreas Nicolaou', date: '14 Aug 2026', time: '10:15', type: 'Follow-up', practitioner: 'Dr. E. Christou', notes: 'Follow-up appointment.', outcome: 'Scheduled' },
  { id: 'VIS-00239', patientId: 'RSQ-P-000246', patientName: 'Eleni Christou', date: '13 Aug 2026', time: '15:00', type: 'Laboratory', practitioner: 'ResQ Lab', notes: 'Blood tests and results review.', outcome: 'Completed' },
];

export default function Visits() {
  const [visits, setVisits] = useState(initialVisits);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patientId: '', date: '', time: '', type: 'Consultation', practitioner: '', notes: '' });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? visits.filter(v => `${v.id} ${v.patientId} ${v.patientName} ${v.type} ${v.practitioner}`.toLowerCase().includes(q)) : visits;
  }, [search, visits]);

  const createVisit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.date || !form.time) return;
    const patient = form.patientId.split('|');
    const visit: Visit = {
      id: `VIS-${String(242 + visits.length).padStart(5, '0')}`,
      patientId: patient[0], patientName: patient[1], date: form.date, time: form.time,
      type: form.type, practitioner: form.practitioner || 'Not assigned', notes: form.notes || 'No notes added.', outcome: 'Scheduled'
    };
    setVisits([visit, ...visits]);
    setForm({ patientId: '', date: '', time: '', type: 'Consultation', practitioner: '', notes: '' });
    setShowForm(false);
  };

  return <>
    <div className="page-heading"><div><p className="eyebrow">PATIENT HISTORY</p><h1>Visits</h1><p className="muted">Record and track patient visits and clinical activity.</p></div><button className="primary" onClick={() => setShowForm(true)}><Plus size={17}/> New visit</button></div>
    <div className="case-summary"><div><span>Total visits</span><strong>{visits.length}</strong></div><div><span>Today</span><strong>{visits.filter(v => v.date === '14 Aug 2026').length}</strong></div><div><span>Scheduled</span><strong>{visits.filter(v => v.outcome === 'Scheduled').length}</strong></div><div><span>Completed</span><strong>{visits.filter(v => v.outcome === 'Completed').length}</strong></div></div>
    <div className="patient-toolbar"><div className="patient-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search visit ID, patient, type or practitioner..."/></div><span className="result-count">{filtered.length} visits</span></div>
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Visit</th><th>Patient</th><th>Date & time</th><th>Type</th><th>Practitioner</th><th>Outcome</th></tr></thead><tbody>{filtered.map(v => <tr key={v.id}><td><strong>{v.id}</strong><small className="cell-sub"><FileText size={12}/> {v.notes}</small></td><td><div className="patient-name"><span className="mini-avatar"><UserRound size={16}/></span><span><strong>{v.patientName}</strong><small className="cell-sub">{v.patientId}</small></span></div></td><td><div className="contact-cell"><span><CalendarDays size={13}/>{v.date}</span><span><Clock size={13}/>{v.time}</span></div></td><td>{v.type}</td><td>{v.practitioner}</td><td><b className={`badge ${v.outcome === 'Completed' ? 'approved' : v.outcome === 'Cancelled' ? 'rejected' : 'pending'}`}>{v.outcome}</b></td></tr>)}</tbody></table></div></section>

    {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">VISIT REGISTRATION</p><h2>New visit</h2></div><button className="modal-close" onClick={() => setShowForm(false)}><X size={20}/></button></div><form onSubmit={createVisit}><div className="form-grid"><label>Patient<select required value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})}><option value="">Select patient...</option><option value="RSQ-P-000248|Maria Georgiou">RSQ-P-000248 — Maria Georgiou</option><option value="RSQ-P-000247|Andreas Nicolaou">RSQ-P-000247 — Andreas Nicolaou</option><option value="RSQ-P-000246|Eleni Christou">RSQ-P-000246 — Eleni Christou</option><option value="RSQ-P-000245|Petros Ioannou">RSQ-P-000245 — Petros Ioannou</option></select></label><label>Visit type<select value={form.type} onChange={e => setForm({...form,type:e.target.value})}><option>Consultation</option><option>Follow-up</option><option>Laboratory</option><option>Medication</option><option>Procedure</option><option>Other</option></select></label><label>Date<input required type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></label><label>Time<input required type="time" value={form.time} onChange={e => setForm({...form,time:e.target.value})}/></label><label>Practitioner<input value={form.practitioner} onChange={e => setForm({...form,practitioner:e.target.value})} placeholder="Dr. ..."/></label><label>Notes<textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Visit notes..."/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="primary"><CalendarDays size={16}/> Schedule visit</button></div></form></div></div>}
  </>;
}
