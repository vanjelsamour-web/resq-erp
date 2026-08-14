import React,{useState} from 'react';
import ReactDOM from 'react-dom/client';
import AppShell from './AppShell';
import Dashboard from './Dashboard';
import Patients from './Patients';
import Cases from './Cases';
import Visits from './Visits';
import Invoices from './Invoices';
import Payments from './Payments';
import {initialCases,initialPatients} from './data';
import {Case,Patient,Status} from './types';
import './styles.css';

function Placeholder({name}:{name:string}){return <section className="empty-module"><h2>{name} module</h2><p>The module shell is ready. Database-backed workflows will be implemented here.</p><button className="primary">Configure {name}</button></section>}

function App(){
 const[active,setActive]=useState('Dashboard');const[sidebarOpen,setSidebarOpen]=useState(false);const[patients,setPatients]=useState<Patient[]>(initialPatients);const[cases,setCases]=useState<Case[]>(initialCases);
 const navigate=(module:string)=>{setActive(module);setSidebarOpen(false)};
 const addPatient=(patient:Patient)=>setPatients(current=>[patient,...current]);
 const addCase=(record:Case)=>setCases(current=>[record,...current]);
 const updateCaseStatus=(id:string,status:Status)=>setCases(current=>current.map(c=>c.id===id?{...c,status}:c));
 const content=active==='Dashboard'?<Dashboard patientsCount={patients.length} cases={cases} onNavigate={navigate}/>:active==='Patients'?<Patients patients={patients} onAdd={addPatient}/>:active==='Cases'?<Cases cases={cases} patients={patients} onAdd={addCase} onStatus={updateCaseStatus}/>:active==='Visits'?<Visits/>:active==='Invoices'?<Invoices/>:active==='Payments'?<Payments/>:<Placeholder name={active}/>;
 return <AppShell active={active} onNavigate={navigate} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}>{content}</AppShell>;
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App/></React.StrictMode>);
