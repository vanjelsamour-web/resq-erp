import React,{useState} from 'react';
import {Plus,Search,X} from 'lucide-react';
import {Case,Patient,Status} from './types';
import {badge} from './data';

type Props={cases:Case[];patients:Patient[];onAdd:(c:Case)=>void;onStatus:(id:string,status:Status)=>void};

export default function Cases({cases,patients,onAdd,onStatus}:Props){
 const[search,setSearch]=useState('');
 const[filter,setFilter]=useState('All');
 const[show,setShow]=useState(false);
 const[saving,setSaving]=useState(false);
 const[error,setError]=useState('');
 const[form,setForm]=useState({patientId:'',type:'Consultation',amount:'',notes:''});
 const filtered=cases.filter(c=>{const q=search.toLowerCase().trim();return (filter==='All'||c.status===filter)&&(!q||`${c.id} ${c.patientId} ${c.patientName} ${c.type}`.toLowerCase().includes(q))});
 const create=async(e:React.FormEvent)=>{
  e.preventDefault();
  if(!form.patientId||!form.amount||saving)return;
  try{
   setSaving(true);setError('');
   const response=await fetch('/api/cases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Unable to create case');
   onAdd(data);
   setForm({patientId:'',type:'Consultation',amount:'',notes:''});setShow(false);
  }catch(err){setError(err instanceof Error?err.message:'Unable to create case')}
  finally{setSaving(false)}
 };
 const changeStatus=async(id:string,status:Status)=>{
  try{
   setError('');
   const response=await fetch(`/api/cases/${encodeURIComponent(id)}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
   const data=await response.json();
   if(!response.ok)throw new Error(data.error||'Unable to update case');
   onStatus(id,data.status);
  }catch(err){setError(err instanceof Error?err.message:'Unable to update case')}
 };
 return <><div className="page-heading"><div><p className="eyebrow">CASE MANAGEMENT</p><h1>Cases</h1><p className="muted">Track cases, decisions, amounts and supporting documentation.</p></div><button className="primary" onClick={()=>{setError('');setShow(true)}}><Plus size={17}/> New case</button></div>
 <div className="case-summary"><div><span>Total</span><strong>{cases.length}</strong></div><div><span>Pending</span><strong>{cases.filter(c=>c.status==='Pending').length}</strong></div><div><span>Under review</span><strong>{cases.filter(c=>c.status==='Under review').length}</strong></div><div><span>Approved amount</span><strong>€{cases.filter(c=>c.status==='Approved').reduce((s,c)=>s+c.amount,0).toLocaleString()}</strong></div></div>
 <div className="patient-toolbar"><div className="patient-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search case ID, patient, type..."/></div><select className="filter-select" value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Pending</option><option>Under review</option><option>Approved</option><option>Rejected</option></select></div>
 {error&&<div className="panel" style={{marginBottom:16,padding:14}}>{error}</div>}
 <section className="panel"><div className="table-wrap"><table><thead><tr><th>Case</th><th>Patient</th><th>Type</th><th>Created</th><th>Amount</th><th>Decision</th><th>Actions</th></tr></thead><tbody>{filtered.map(c=><tr key={c.id}><td><strong>{c.id}</strong><small className="cell-sub">{c.notes}</small></td><td><strong>{c.patientName}</strong><small className="cell-sub">{c.patientId}</small></td><td>{c.type}</td><td>{c.created}</td><td>€{c.amount.toLocaleString()}</td><td><b className={`badge ${badge(c.status)}`}>{c.status}</b></td><td><div className="decision-actions">{c.status!=='Approved'&&<button onClick={()=>changeStatus(c.id,'Approved')}>Approve</button>}{c.status!=='Rejected'&&<button onClick={()=>changeStatus(c.id,'Rejected')}>Reject</button>}{c.status==='Pending'&&<button onClick={()=>changeStatus(c.id,'Under review')}>Review</button>}</div></td></tr>)}</tbody></table></div></section>
 {show&&<div className="modal-backdrop" onMouseDown={()=>!saving&&setShow(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">CASE REGISTRATION</p><h2>New case</h2></div><button className="modal-close" onClick={()=>!saving&&setShow(false)}><X size={20}/></button></div><form onSubmit={create}><div className="form-grid"><label>Patient<select required value={form.patientId} onChange={e=>setForm({...form,patientId:e.target.value})}><option value="">Select patient...</option>{patients.map(p=><option key={p.id} value={p.id}>{p.id} — {p.name}</option>)}</select></label><label>Case type<select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option>Consultation</option><option>Follow-up</option><option>Laboratory</option><option>Medication</option><option>Hospitalization</option><option>Other</option></select></label><label>Claim / case amount (€)<input required type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/></label><label>Notes<textarea value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={()=>!saving&&setShow(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':'Create case'}</button></div></form></div></div>}
 </>;
}
