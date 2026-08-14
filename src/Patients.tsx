import React,{useEffect,useMemo,useState} from 'react';
import {Mail,Phone,Plus,Search,UserRound,X} from 'lucide-react';
import {Patient} from './types';
import {badge} from './data';

type Props={patients:Patient[];onAdd:(p:Patient)=>void};

export default function Patients({patients:initialPatients,onAdd}:Props){
 const [patients,setPatients]=useState<Patient[]>(initialPatients);
 const [search,setSearch]=useState('');
 const [show,setShow]=useState(false);
 const [selected,setSelected]=useState<Patient|null>(null);
 const [form,setForm]=useState({name:'',dob:'',phone:'',email:''});
 const [loading,setLoading]=useState(true);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [history,setHistory]=useState<any>(null);

 useEffect(()=>{setPatients(initialPatients)},[initialPatients]);

 useEffect(()=>{
  let cancelled=false;
  const timer=window.setTimeout(async()=>{
   try{
    setLoading(true);setError('');
    const response=await fetch(`/api/patients?search=${encodeURIComponent(search.trim())}`);
    if(!response.ok) throw new Error('Unable to load patients');
    const data=await response.json();
    if(!cancelled) setPatients(data);
   }catch(err){
    if(!cancelled) setError(err instanceof Error?err.message:'Unable to load patients');
   }finally{if(!cancelled)setLoading(false)}
  },250);
  return()=>{cancelled=true;window.clearTimeout(timer)};
 },[search]);

 const filtered=useMemo(()=>{
  if(search.trim()) return patients;
  return patients;
 },[patients,search]);

 const openProfile=async(p:Patient)=>{
  setSelected(p);setHistory(null);setError('');
  try{
   const response=await fetch(`/api/patients?id=${encodeURIComponent(p.id)}`);
   if(response.ok){const data=await response.json();setHistory(data.history)}
  }catch{ /* profile remains usable even if history cannot be loaded */ }
 };

 const create=async(e:React.FormEvent)=>{
  e.preventDefault();if(!form.name.trim()||saving)return;
  try{
   setSaving(true);setError('');
   const response=await fetch('/api/patients',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
   const data=await response.json();
   if(!response.ok) throw new Error(data.error||'Unable to create patient');
   setPatients(current=>[data,...current.filter(p=>p.id!==data.id)]);
   onAdd(data);
   setForm({name:'',dob:'',phone:'',email:''});setShow(false);
  }catch(err){setError(err instanceof Error?err.message:'Unable to create patient')}
  finally{setSaving(false)}
 };

 return <><div className="page-heading"><div><p className="eyebrow">PATIENT MANAGEMENT</p><h1>Patients</h1><p className="muted">Search, register and manage patient records.</p></div><button className="primary" onClick={()=>setShow(true)}><Plus size={17}/> New patient</button></div>
 <div className="patient-toolbar"><div className="patient-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by patient ID, name, phone or email..."/></div><span className="result-count">{loading?'Loading…':`${filtered.length} patients`}</span></div>
 {error&&<div className="panel" style={{marginBottom:16,padding:14}}>{error}</div>}
 <section className="panel"><div className="table-wrap"><table><thead><tr><th>Patient ID</th><th>Patient</th><th>Date of birth</th><th>Contact</th><th>Status</th><th>Last visit</th></tr></thead><tbody>{filtered.map(p=><tr key={p.id} className="clickable-row" onClick={()=>openProfile(p)}><td><strong>{p.id}</strong></td><td><div className="patient-name"><span className="mini-avatar"><UserRound size={16}/></span>{p.name}</div></td><td>{p.dob||'—'}</td><td><div className="contact-cell"><span><Phone size={13}/>{p.phone||'—'}</span><span><Mail size={13}/>{p.email||'—'}</span></div></td><td><b className={`badge ${badge(p.status)}`}>{p.status}</b></td><td>{p.lastVisit}</td></tr>)}</tbody></table></div></section>
 {show&&<div className="modal-backdrop" onMouseDown={()=>!saving&&setShow(false)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-header"><div><p className="eyebrow">PATIENT REGISTRATION</p><h2>New patient</h2></div><button className="modal-close" onClick={()=>!saving&&setShow(false)}><X size={20}/></button></div><form onSubmit={create}><div className="form-grid"><label>Full name<input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Date of birth<input type="date" value={form.dob} onChange={e=>setForm({...form,dob:e.target.value})}/></label><label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label><label>Email<input type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label></div><div className="form-actions"><button type="button" className="secondary" onClick={()=>!saving&&setShow(false)}>Cancel</button><button className="primary" disabled={saving}>{saving?'Saving…':'Create patient'}</button></div></form></div></div>}
 {selected&&<div className="modal-backdrop" onMouseDown={()=>setSelected(null)}><div className="modal" onMouseDown={e=>e.stopPropagation()}><div className="modal-header"><div className="profile-title"><div className="profile-avatar"><UserRound/></div><div><p className="eyebrow">PATIENT PROFILE</p><h2>{selected.name}</h2><span>{selected.id}</span></div></div><button className="modal-close" onClick={()=>setSelected(null)}><X size={20}/></button></div><div className="profile-grid"><div><small>Date of birth</small><strong>{selected.dob||'Not provided'}</strong></div><div><small>Status</small><strong><b className={`badge ${badge(selected.status)}`}>{selected.status}</b></strong></div><div><small>Phone</small><strong>{selected.phone||'Not provided'}</strong></div><div><small>Email</small><strong>{selected.email||'Not provided'}</strong></div></div><div className="profile-section"><h3>Patient history</h3>{history?<p>{history.cases?.length||0} cases · {history.visits?.length||0} visits · {history.invoices?.length||0} invoices · {history.medications?.length||0} medicines</p>:<p>Loading patient history…</p>}</div></div></div>}
 </>;
}
