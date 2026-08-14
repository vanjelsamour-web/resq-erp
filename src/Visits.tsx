import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, FileText, Plus, Search, UserRound, X } from 'lucide-react';

type Patient = { id: string; name: string; status: string };
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
  caseId?: string | null;
};

function displayDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Visits() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ patientId: '', date: '', time: '', type: 'Consultation', practitioner: '', notes: '', caseId: '' });

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [patientsRes, visitsRes] = await Promise.all([fetch('/api/patients'), fetch('/api/visits')]);
      if (!patientsRes.ok) throw new Error('Unable to load patients');
      if (!visitsRes.ok) throw new Error('Unable to load visits');
      const [patientsData, visitsData] = await Promise.all([patientsRes.json(), visitsRes.json()]);
      setPatients(patientsData);
      setVisits(visitsData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to load visit data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? visits.filter(v => `${v.id} ${v.patientId} ${v.patientName} ${v.type} ${v.practitioner}`.toLowerCase().includes(q)) : visits;
  }, [search, visits]);

  const today = new Date().toISOString().slice(0, 10);

  const createVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.patientId || !form.date || !form.time) return;
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: form.patientId,
          scheduledAt: new Date(`${form.date}T${form.time}`).toISOString(),
          type: form.type,
          practitioner: form.practitioner,
          notes: form.notes,
          caseId: form.caseId || undefined,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to create visit');
      setVisits(current => [data, ...current]);
      setForm({ patientId: '', date: '', time: '', type: 'Consultation', practitioner: '', notes: '', caseId: '' });
      setShowForm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to create visit');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <div className="page-heading"><div><p className="eyebrow">PATIENT HISTORY</p><h1>Visits</h1><p className="muted">Record and track patient visits and clinical activity.</p></div><button className="primary" onClick={() => setShowForm(true)}><Plus size={17}/> New visit</button></div>
    <div className="case-summary"><div><span>Total visits</span><strong>{visits.length}</strong></div><div><span>Today</span><strong>{visits.filter(v => v.date === today).length}</strong></div><div><span>Scheduled</span><strong>{visits.filter(v => v.outcome === 'Scheduled').length}</strong></div><div><span>Completed</span><strong>{visits.filter(v => v.outcome === 'Completed').length}</strong></div></div>
    <div className="patient-toolbar"><div className="patient-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search visit ID, patient, type or practitioner..."/></div><span className="result-count">{filtered.length} visits</span></div>
    {error && <div className="panel" style={{ padding: 16, marginBottom: 16 }}>{error}</div>}
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Visit</th><th>Patient</th><th>Date & time</th><th>Type</th><th>Practitioner</th><th>Outcome</th></tr></thead><tbody>{loading ? <tr><td colSpan={6}>Loading visits...</td></tr> : filtered.map(v => <tr key={v.id}><td><strong>{v.id}</strong><small className="cell-sub"><FileText size={12}/> {v.notes}</small></td><td><div className="patient-name"><span className="mini-avatar"><UserRound size={16}/></span><span><strong>{v.patientName}</strong><small className="cell-sub">{v.patientId}</small></span></div></td><td><div className="contact-cell"><span><CalendarDays size={13}/>{displayDate(v.date)}</span><span><Clock size={13}/>{v.time}</span></div></td><td>{v.type}</td><td>{v.practitioner}</td><td><b className={`badge ${v.outcome === 'Completed' ? 'approved' : v.outcome === 'Cancelled' ? 'rejected' : 'pending'}`}>{v.outcome}</b></td></tr>)}</tbody></table></div></section>

    {showForm && <div className="modal-backdrop" onMouseDown={() => setShowForm(false)}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">VISIT REGISTRATION</p><h2>New visit</h2></div><button className="modal-close" onClick={() => setShowForm(false)}><X size={20}/></button></div><form onSubmit={createVisit}><div className="form-grid"><label>Patient<select required value={form.patientId} onChange={e => setForm({...form, patientId: e.target.value})}><option value="">Select patient...</option>{patients.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}</select></label><label>Visit type<select value={form.type} onChange={e => setForm({...form,type:e.target.value})}><option>Consultation</option><option>Follow-up</option><option>Laboratory</option><option>Medication</option><option>Procedure</option><option>Other</option></select></label><label>Date<input required type="date" value={form.date} onChange={e => setForm({...form,date:e.target.value})}/></label><label>Time<input required type="time" value={form.time} onChange={e => setForm({...form,time:e.target.value})}/></label><label>Practitioner<input value={form.practitioner} onChange={e => setForm({...form,practitioner:e.target.value})} placeholder="Dr. ..."/></label><label>Notes<textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} placeholder="Visit notes..."/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button><button className="primary" disabled={saving || patients.length === 0}><CalendarDays size={16}/> {saving ? 'Saving...' : 'Schedule visit'}</button></div></form></div></div>}
  </>;
}
