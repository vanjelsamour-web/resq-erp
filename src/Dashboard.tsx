import React from 'react';
import { CalendarDays, CreditCard, FileText, Users } from 'lucide-react';
import { Case } from './types';
import { badge } from './data';

type Props={patientsCount:number; cases:Case[]; onNavigate:(module:string)=>void};
export default function Dashboard({patientsCount,cases,onNavigate}:Props){
 return <>
  <div className="page-heading"><div><p className="eyebrow">RESQ MANAGEMENT SYSTEM</p><h1>Dashboard</h1><p className="muted">Overview of your operations and activity.</p></div><button className="primary" onClick={()=>onNavigate('Cases')}>+ New case</button></div>
  <div className="stats-grid">
   <div className="stat-card"><span>Active patients</span><strong>{patientsCount}</strong><small>+12 this month</small></div>
   <div className="stat-card"><span>Open cases</span><strong>{cases.filter(c=>c.status==='Pending'||c.status==='Under review').length}</strong><small>Pending review</small></div>
   <div className="stat-card"><span>Visits today</span><strong>24</strong><small>6 remaining</small></div>
   <div className="stat-card"><span>Outstanding</span><strong>€8,420</strong><small>14 invoices</small></div>
  </div>
  <div className="dashboard-grid">
   <section className="panel"><div className="panel-header"><div><h2>Recent cases</h2><p>Latest patient activity</p></div><button className="link-button" onClick={()=>onNavigate('Cases')}>View all</button></div><div className="table-wrap"><table><thead><tr><th>Case</th><th>Patient</th><th>Type</th><th>Status</th></tr></thead><tbody>{cases.slice(0,4).map(c=><tr key={c.id}><td>{c.id}</td><td>{c.patientName}</td><td>{c.type}</td><td><b className={`badge ${badge(c.status)}`}>{c.status}</b></td></tr>)}</tbody></table></div></section>
   <section className="panel"><div className="panel-header"><div><h2>Quick actions</h2><p>Common operations</p></div></div><div className="quick-grid"><button onClick={()=>onNavigate('Patients')}><Users size={20}/><span>New patient</span></button><button onClick={()=>onNavigate('Cases')}><FileText size={20}/><span>New case</span></button><button onClick={()=>onNavigate('Visits')}><CalendarDays size={20}/><span>Record visit</span></button><button onClick={()=>onNavigate('Invoices')}><CreditCard size={20}/><span>Create invoice</span></button></div></section>
  </div>
 </>;
}
