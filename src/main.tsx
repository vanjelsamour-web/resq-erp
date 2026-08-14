import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Activity, Bell, CalendarDays, CreditCard, FileText, LayoutDashboard, Menu, Pill, Search, Settings, Users, X, Plus, Phone, Mail, UserRound } from 'lucide-react';
import './styles.css';

type Module = { label: string; icon: React.ReactNode };
type Patient = { id: string; name: string; dob: string; phone: string; email: string; status: 'Active' | 'Inactive'; lastVisit: string };

const modules: Module[] = [
  { label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Patients', icon: <Users size={18} /> },
  { label: 'Cases', icon: <FileText size={18} /> },
  { label: 'Visits', icon: <CalendarDays size={18} /> },
  { label: 'Invoices', icon: <CreditCard size={18} /> },
  { label: 'Payments', icon: <Activity size={18} /> },
  { label: 'Medicines', icon: <Pill size={18} /> },
];

const stats = [
  ['Active patients', '248', '+12 this month'],
  ['Open cases', '37', '8 pending review'],
  ['Visits today', '24', '6 remaining'],
  ['Outstanding', '€8,420', '14 invoices'],
];

const initialPatients: Patient[] = [
  { id: 'RSQ-P-000248', name: 'Maria Georgiou', dob: '1988-04-12', phone: '+357 99 123456', email: 'maria.georgiou@example.com', status: 'Active', lastVisit: '14 Aug 2026' },
  { id: 'RSQ-P-000247', name: 'Andreas Nicolaou', dob: '1975-09-21', phone: '+357 96 234567', email: 'andreas.nicolaou@example.com', status: 'Active', lastVisit: '13 Aug 2026' },
  { id: 'RSQ-P-000246', name: 'Eleni Christou', dob: '1992-02-03', phone: '+357 97 345678', email: 'eleni.christou@example.com', status: 'Active', lastVisit: '12 Aug 2026' },
  { id: 'RSQ-P-000245', name: 'Petros Ioannou', dob: '1969-11-18', phone: '+357 99 456789', email: 'petros.ioannou@example.com', status: 'Inactive', lastVisit: '28 Jul 2026' },
];

function App() {
  const [active, setActive] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patients, setPatients] = useState(initialPatients);
  const [patientSearch, setPatientSearch] = useState('');
  const [showPatientForm, setShowPatientForm] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [form, setForm] = useState({ name: '', dob: '', phone: '', email: '' });

  const filteredPatients = useMemo(() => {
    const query = patientSearch.toLowerCase().trim();
    if (!query) return patients;
    return patients.filter(p => `${p.id} ${p.name} ${p.phone} ${p.email}`.toLowerCase().includes(query));
  }, [patientSearch, patients]);

  const createPatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const id = `RSQ-P-${String(249 + patients.length - 4).padStart(6, '0')}`;
    const patient: Patient = { ...form, id, status: 'Active', lastVisit: '—' };
    setPatients([patient, ...patients]);
    setForm({ name: '', dob: '', phone: '', email: '' });
    setShowPatientForm(false);
  };

  return (
    <div className="shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand"><div className="brand-mark">R</div><div><strong>RESQ</strong><span>ERP</span></div><button className="close-mobile" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
        <div className="nav-label">WORKSPACE</div>
        <nav>{modules.map(item => <button key={item.label} className={active === item.label ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(item.label); setSidebarOpen(false); }} >{item.icon}<span>{item.label}</span></button>)}</nav>
        <div className="sidebar-bottom"><button className="nav-item"><Settings size={18}/><span>Settings</span></button><div className="user-card"><div className="avatar">VS</div><div><strong>RESQ Admin</strong><small>Administrator</small></div></div></div>
      </aside>
      {sidebarOpen && <button className="overlay" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}
      <section className="main-area">
        <header className="topbar"><button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={22}/></button><div className="search"><Search size={18}/><input placeholder="Search patients, cases, invoices..." /></div><button className="icon-button" aria-label="Notifications"><Bell size={19}/><i/></button><div className="top-avatar">VS</div></header>
        <main className="content">
          {active === 'Patients' ? (
            <>
              <div className="page-heading"><div><p className="eyebrow">PATIENT MANAGEMENT</p><h1>Patients</h1><p className="muted">Search, register and manage patient records.</p></div><button className="primary" onClick={() => setShowPatientForm(true)}><Plus size={17}/> New patient</button></div>
              <div className="patient-toolbar"><div className="patient-search"><Search size={18}/><input value={patientSearch} onChange={e => setPatientSearch(e.target.value)} placeholder="Search by patient ID, name, phone or email..." /></div><span className="result-count">{filteredPatients.length} patients</span></div>
              <section className="panel"><div className="table-wrap"><table><thead><tr><th>Patient ID</th><th>Patient</th><th>Date of birth</th><th>Contact</th><th>Status</th><th>Last visit</th></tr></thead><tbody>{filteredPatients.map(p => <tr key={p.id} className="clickable-row" onClick={() => setSelectedPatient(p)}><td><strong>{p.id}</strong></td><td><div className="patient-name"><span className="mini-avatar"><UserRound size={16}/></span>{p.name}</div></td><td>{p.dob}</td><td><div className="contact-cell"><span><Phone size={13}/>{p.phone}</span><span><Mail size={13}/>{p.email}</span></div></td><td><b className={`badge ${p.status === 'Active' ? 'approved' : 'review'}`}>{p.status}</b></td><td>{p.lastVisit}</td></tr>)}{filteredPatients.length === 0 && <tr><td colSpan={6} className="no-results">No patients found.</td></tr>}</tbody></table></div></section>
              <p className="module-note">Patient IDs are generated automatically and will become persistent when the database layer is connected.</p>
            </>
          ) : active === 'Dashboard' ? (
            <><div className="page-heading"><div><p className="eyebrow">RESQ MANAGEMENT SYSTEM</p><h1>Dashboard</h1><p className="muted">Overview of your operations and activity.</p></div><button className="primary" onClick={() => setActive('Cases')}>+ New case</button></div><div className="stats-grid">{stats.map(([title,value,detail]) => <div className="stat-card" key={title}><span>{title}</span><strong>{value}</strong><small>{detail}</small></div>)}</div><div className="dashboard-grid"><section className="panel"><div className="panel-header"><div><h2>Recent cases</h2><p>Latest patient activity</p></div><button className="link-button" onClick={() => setActive('Cases')}>View all</button></div><div className="table-wrap"><table><thead><tr><th>Case</th><th>Patient</th><th>Type</th><th>Status</th></tr></thead><tbody><tr><td>#RSQ-1048</td><td>Maria Georgiou</td><td>Consultation</td><td><b className="badge pending">Pending</b></td></tr><tr><td>#RSQ-1047</td><td>Andreas Nicolaou</td><td>Follow-up</td><td><b className="badge approved">Approved</b></td></tr><tr><td>#RSQ-1046</td><td>Eleni Christou</td><td>Laboratory</td><td><b className="badge review">Review</b></td></tr><tr><td>#RSQ-1045</td><td>Petros Ioannou</td><td>Medication</td><td><b className="badge approved">Approved</b></td></tr></tbody></table></div></section><section className="panel activity-panel"><div className="panel-header"><div><h2>Quick actions</h2><p>Common operations</p></div></div><div className="quick-grid"><button onClick={() => {setActive('Patients');setShowPatientForm(true)}}><Users size={20}/><span>New patient</span></button><button onClick={() => setActive('Cases')}><FileText size={20}/><span>New case</span></button><button onClick={() => setActive('Visits')}><CalendarDays size={20}/><span>Record visit</span></button><button onClick={() => setActive('Invoices')}><CreditCard size={20}/><span>Create invoice</span></button></div></section></div></>
          ) : <section className="empty-module"><div className="empty-icon">{modules.find(m => m.label === active)?.icon}</div><h2>{active} module</h2><p>The module structure is ready. We will implement its database, forms, search, filters and workflows next.</p><button className="primary">Configure {active}</button></section>}
        </main>
      </section>

      {showPatientForm && <div className="modal-backdrop" onMouseDown={() => setShowPatientForm(false)}><div className="modal" onMouseDown={e => e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">PATIENT REGISTRATION</p><h2>New patient</h2></div><button className="modal-close" onClick={() => setShowPatientForm(false)}><X size={20}/></button></div><form onSubmit={createPatient}><div className="form-grid"><label>Full name<input required value={form.name} onChange={e => setForm({...form,name:e.target.value})} placeholder="e.g. Maria Georgiou"/></label><label>Date of birth<input type="date" value={form.dob} onChange={e => setForm({...form,dob:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e => setForm({...form,phone:e.target.value})} placeholder="+357 ..."/></label><label>Email<input type="email" value={form.email} onChange={e => setForm({...form,email:e.target.value})} placeholder="patient@email.com"/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={() => setShowPatientForm(false)}>Cancel</button><button className="primary" type="submit">Create patient</button></div></form></div></div>}
      {selectedPatient && <div className="modal-backdrop" onMouseDown={() => setSelectedPatient(null)}><div className="modal patient-profile" onMouseDown={e => e.stopPropagation()}><div className="modal-header"><div className="profile-title"><div className="profile-avatar"><UserRound/></div><div><p className="eyebrow">PATIENT PROFILE</p><h2>{selectedPatient.name}</h2><span>{selectedPatient.id}</span></div></div><button className="modal-close" onClick={() => setSelectedPatient(null)}><X size={20}/></button></div><div className="profile-grid"><div><small>Date of birth</small><strong>{selectedPatient.dob || 'Not provided'}</strong></div><div><small>Status</small><strong><b className={`badge ${selectedPatient.status === 'Active' ? 'approved' : 'review'}`}>{selectedPatient.status}</b></strong></div><div><small>Phone</small><strong>{selectedPatient.phone || 'Not provided'}</strong></div><div><small>Email</small><strong>{selectedPatient.email || 'Not provided'}</strong></div></div><div className="profile-section"><h3>Patient history</h3><p>Cases, visits, invoices and medicines associated with this patient will appear here.</p></div></div></div>}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
