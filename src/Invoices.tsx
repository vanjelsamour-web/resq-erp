import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X, Receipt, CreditCard } from 'lucide-react';

type InvoiceStatus = 'Draft' | 'Issued' | 'Paid' | 'Partially paid' | 'Overdue';
type Patient = { id: string; name: string; status: string };
type Case = { id: string; patientId: string; patientName: string; type: string; amount: number; status: string };
type Invoice = { id: string; patientId: string; patientName: string; caseId: string | null; date: string; dueDate: string; amount: number; paid: number; status: InvoiceStatus };

function displayDate(value: string) {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const badge = (s: InvoiceStatus) => s === 'Paid' ? 'approved' : s === 'Overdue' ? 'rejected' : s === 'Partially paid' ? 'pending' : 'review';

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [show, setShow] = useState(false);
  const [showPayment, setShowPayment] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ patientId: '', caseId: '', amount: '', dueDate: '' });
  const [payment, setPayment] = useState({ amount: '', method: 'Bank transfer', reference: '' });

  const loadData = async () => {
    setLoading(true); setError('');
    try {
      const [pRes, iRes] = await Promise.all([fetch('/api/patients'), fetch('/api/invoices')]);
      if (!pRes.ok || !iRes.ok) throw new Error('Unable to load invoice data');
      const [p, i] = await Promise.all([pRes.json(), iRes.json()]);
      setPatients(p); setInvoices(i);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to load invoice data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const loadCases = async (patientId: string) => {
    setForm(current => ({ ...current, patientId, caseId: '' }));
    if (!patientId) { setCases([]); return; }
    try {
      const response = await fetch(`/api/cases?patientId=${encodeURIComponent(patientId)}`);
      if (!response.ok) throw new Error('Unable to load patient cases');
      setCases(await response.json());
    } catch (e) { setCases([]); setError(e instanceof Error ? e.message : 'Unable to load patient cases'); }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return invoices.filter(i => (filter === 'All' || i.status === filter) && (!q || `${i.id} ${i.patientName} ${i.patientId} ${i.caseId ?? ''}`.toLowerCase().includes(q)));
  }, [search, filter, invoices]);

  const outstanding = invoices.reduce((s, i) => s + i.amount - i.paid, 0);
  const total = invoices.reduce((s, i) => s + i.amount, 0);
  const paid = invoices.reduce((s, i) => s + i.paid, 0);

  const create = async (e: React.FormEvent) => {
    e.preventDefault(); if (!form.patientId || !form.amount || !form.dueDate) return;
    setSaving(true); setError('');
    try {
      const response = await fetch('/api/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to create invoice');
      setInvoices(current => [data, ...current]); setShow(false); setForm({ patientId: '', caseId: '', amount: '', dueDate: '' }); setCases([]);
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create invoice'); }
    finally { setSaving(false); }
  };

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault(); if (!showPayment || !payment.amount) return;
    setSaving(true); setError('');
    try {
      const response = await fetch(`/api/invoices/${encodeURIComponent(showPayment.id)}/payments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payment) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Unable to record payment');
      setInvoices(current => current.map(i => i.id === data.id ? data : i)); setShowPayment(null); setPayment({ amount: '', method: 'Bank transfer', reference: '' });
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to record payment'); }
    finally { setSaving(false); }
  };

  return <>
    <div className="page-heading"><div><p className="eyebrow">FINANCIAL MANAGEMENT</p><h1>Invoices</h1><p className="muted">Create invoices, track balances and record payments.</p></div><button className="primary" onClick={() => setShow(true)}><Plus size={17}/> New invoice</button></div>
    <div className="case-summary"><div><span>Total invoiced</span><strong>€{total.toLocaleString()}</strong></div><div><span>Paid</span><strong>€{paid.toLocaleString()}</strong></div><div><span>Outstanding</span><strong>€{outstanding.toLocaleString()}</strong></div><div><span>Invoices</span><strong>{invoices.length}</strong></div></div>
    <div className="patient-toolbar"><div className="patient-search"><Search size={18}/><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice, patient, case..."/></div><select className="filter-select" value={filter} onChange={e => setFilter(e.target.value)}><option>All</option><option>Draft</option><option>Issued</option><option>Paid</option><option>Partially paid</option><option>Overdue</option></select></div>
    {error && <div className="panel" style={{ padding: 16, marginBottom: 16 }}>{error}</div>}
    <section className="panel"><div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Patient</th><th>Case</th><th>Issue date</th><th>Due date</th><th>Amount</th><th>Balance</th><th>Status</th><th>Action</th></tr></thead><tbody>{loading ? <tr><td colSpan={9}>Loading invoices...</td></tr> : filtered.map(i => <tr key={i.id}><td><strong>{i.id}</strong></td><td><strong>{i.patientName}</strong><small className="cell-sub">{i.patientId}</small></td><td>{i.caseId ?? '—'}</td><td>{displayDate(i.date)}</td><td>{displayDate(i.dueDate)}</td><td>€{i.amount.toLocaleString()}</td><td>€{(i.amount - i.paid).toLocaleString()}</td><td><b className={`badge ${badge(i.status)}`}>{i.status}</b></td><td>{i.status !== 'Paid' && <button className="link-button" onClick={() => { setShowPayment(i); setPayment({ amount: String((i.amount - i.paid).toFixed(2)), method: 'Bank transfer', reference: '' }); }}><CreditCard size={14}/> Record payment</button>}</td></tr>)}{!loading && !filtered.length && <tr><td colSpan={9} className="no-results">No invoices found.</td></tr>}</tbody></table></div></section>

    {show && <div className="modal-backdrop" onMouseDown={() => setShow(false)}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">INVOICE REGISTRATION</p><h2>New invoice</h2></div><button className="modal-close" onClick={() => setShow(false)}><X size={20}/></button></div><form onSubmit={create}><div className="form-grid"><label>Patient<select required value={form.patientId} onChange={e => loadCases(e.target.value)}><option value="">Select patient...</option>{patients.map(p => <option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}</select></label><label>Case<select value={form.caseId} onChange={e => setForm({ ...form, caseId: e.target.value })} disabled={!form.patientId}><option value="">No case / optional</option>{cases.map(c => <option key={c.id} value={c.id}>{c.id} — {c.type} (€{c.amount.toLocaleString()})</option>)}</select></label><label>Amount (€)<input required type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}/></label><label>Due date<input required type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setShow(false)}>Cancel</button><button className="primary" disabled={saving}><Receipt size={16}/> {saving ? 'Saving...' : 'Create invoice'}</button></div></form></div></div>}

    {showPayment && <div className="modal-backdrop" onMouseDown={() => setShowPayment(null)}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">PAYMENT REGISTRATION</p><h2>{showPayment.id}</h2><p className="muted">Outstanding: €{(showPayment.amount - showPayment.paid).toFixed(2)}</p></div><button className="modal-close" onClick={() => setShowPayment(null)}><X size={20}/></button></div><form onSubmit={recordPayment}><div className="form-grid"><label>Amount (€)<input required type="number" min="0.01" max={(showPayment.amount - showPayment.paid).toFixed(2)} step="0.01" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })}/></label><label>Payment method<select value={payment.method} onChange={e => setPayment({ ...payment, method: e.target.value })}><option>Bank transfer</option><option>Card</option><option>Cash</option></select></label><label>Reference<input value={payment.reference} onChange={e => setPayment({ ...payment, reference: e.target.value })} placeholder="Transaction/reference"/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setShowPayment(null)}>Cancel</button><button className="primary" disabled={saving}><CreditCard size={16}/> {saving ? 'Saving...' : 'Record payment'}</button></div></form></div></div>}
  </>;
}
