import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { Activity, Bell, CalendarDays, CreditCard, FileText, LayoutDashboard, Menu, Pill, Search, Settings, Users, X } from 'lucide-react';
import './styles.css';

type Module = { label: string; icon: React.ReactNode };

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

function App() {
  const [active, setActive] = useState('Dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="shell">
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">R</div>
          <div><strong>RESQ</strong><span>ERP</span></div>
          <button className="close-mobile" onClick={() => setSidebarOpen(false)} aria-label="Close menu"><X size={20} /></button>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {modules.map((item) => (
            <button key={item.label} className={active === item.label ? 'nav-item active' : 'nav-item'} onClick={() => { setActive(item.label); setSidebarOpen(false); }}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="nav-item"><Settings size={18} /><span>Settings</span></button>
          <div className="user-card"><div className="avatar">VS</div><div><strong>RESQ Admin</strong><small>Administrator</small></div></div>
        </div>
      </aside>

      {sidebarOpen && <button className="overlay" onClick={() => setSidebarOpen(false)} aria-label="Close navigation" />}

      <section className="main-area">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu"><Menu size={22} /></button>
          <div className="search"><Search size={18} /><input placeholder="Search patients, cases, invoices..." /></div>
          <button className="icon-button" aria-label="Notifications"><Bell size={19} /><i /></button>
          <div className="top-avatar">VS</div>
        </header>

        <main className="content">
          <div className="page-heading"><div><p className="eyebrow">RESQ MANAGEMENT SYSTEM</p><h1>{active}</h1><p className="muted">Overview of your operations and activity.</p></div><button className="primary">+ New case</button></div>

          {active === 'Dashboard' ? <>
            <div className="stats-grid">
              {stats.map(([title, value, detail]) => <div className="stat-card" key={title}><span>{title}</span><strong>{value}</strong><small>{detail}</small></div>)}
            </div>
            <div className="dashboard-grid">
              <section className="panel"><div className="panel-header"><div><h2>Recent cases</h2><p>Latest patient activity</p></div><button className="link-button">View all</button></div><div className="table-wrap"><table><thead><tr><th>Case</th><th>Patient</th><th>Type</th><th>Status</th></tr></thead><tbody>
                <tr><td>#RSQ-1048</td><td>Maria Georgiou</td><td>Consultation</td><td><b className="badge pending">Pending</b></td></tr>
                <tr><td>#RSQ-1047</td><td>Andreas Nicolaou</td><td>Follow-up</td><td><b className="badge approved">Approved</b></td></tr>
                <tr><td>#RSQ-1046</td><td>Eleni Christou</td><td>Laboratory</td><td><b className="badge review">Review</b></td></tr>
                <tr><td>#RSQ-1045</td><td>Petros Ioannou</td><td>Medication</td><td><b className="badge approved">Approved</b></td></tr>
              </tbody></table></div></section>
              <section className="panel activity-panel"><div className="panel-header"><div><h2>Quick actions</h2><p>Common operations</p></div></div><div className="quick-grid"><button><Users size={20}/><span>New patient</span></button><button><FileText size={20}/><span>New case</span></button><button><CalendarDays size={20}/><span>Record visit</span></button><button><CreditCard size={20}/><span>Create invoice</span></button></div></section>
            </div>
          </> : <section className="empty-module"><div className="empty-icon">{modules.find(m => m.label === active)?.icon}</div><h2>{active} module</h2><p>The module structure is ready. We will implement its database, forms, search, filters and workflows next.</p><button className="primary">Configure {active}</button></section>}
        </main>
      </section>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
