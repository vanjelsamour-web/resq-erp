import React,{useEffect,useState} from 'react';
import {BarChart3,Boxes,FileText,Receipt,Users,Wallet,RefreshCw} from 'lucide-react';

type LoadState={status:'loading'|'ready'|'error';message?:string};

async function fetchJson<T>(url:string,timeoutMs=10000):Promise<T>{
 const controller=new AbortController();
 const timer=window.setTimeout(()=>controller.abort(),timeoutMs);
 try{
  const r=await fetch(url,{cache:'no-store',signal:controller.signal});
  const data=await r.json().catch(()=>null);
  if(!r.ok) throw new Error(data?.error||`${url} returned ${r.status}`);
  return data as T;
 }catch(e){
  if(e instanceof DOMException&&e.name==='AbortError') throw new Error(`Request timed out: ${url}`);
  throw e;
 }finally{window.clearTimeout(timer)}
}

export default function Reports(){
 const[s,setS]=useState<any>(null);const[c,setC]=useState<any[]>([]);const[invoices,setInvoices]=useState<any[]>([]);const[items,setItems]=useState<any[]>([]);const[movements,setMovements]=useState<any[]>([]);
 const[selected,setSelected]=useState('Financial summary');
 const[summaryState,setSummaryState]=useState<LoadState>({status:'loading'});
 const[dataErrors,setDataErrors]=useState<string[]>([]);

 const load=async()=>{
  setSummaryState({status:'loading'});setDataErrors([]);
  try{
   // Load the primary report independently. A slow/failing secondary endpoint must never
   // keep the whole Reports page stuck on "Loading live reports...".
   const summary=await fetchJson<any>('/api/reports/summary',10000);setS(summary);setSummaryState({status:'ready'});
  }catch(e){setS(null);setSummaryState({status:'error',message:e instanceof Error?e.message:'Unable to load report summary'})}

  const results=await Promise.allSettled([
   fetchJson<any[]>('/api/reports/cases',10000),
   fetchJson<any[]>('/api/invoices',10000),
   fetchJson<any[]>('/api/inventory',10000),
   fetchJson<any[]>('/api/inventory/movements',10000)
  ]);
  const errors:string[]=[];
  if(results[0].status==='fulfilled')setC(results[0].value);else errors.push(`Case profitability: ${results[0].reason?.message||'failed'}`);
  if(results[1].status==='fulfilled')setInvoices(results[1].value);else errors.push(`Invoices & payments: ${results[1].reason?.message||'failed'}`);
  if(results[2].status==='fulfilled')setItems(results[2].value);else errors.push(`Inventory: ${results[2].reason?.message||'failed'}`);
  if(results[3].status==='fulfilled')setMovements(results[3].value);else errors.push(`Staff activity: ${results[3].reason?.message||'failed'}`);
  setDataErrors(errors);
 };
 useEffect(()=>{load()},[]);

 if(summaryState.status==='loading')return <section className="empty-module"><div><div className="empty-icon"><BarChart3/></div><h2>Reports</h2><p>Loading live reports from PostgreSQL...</p></div></section>;
 if(summaryState.status==='error')return <section className="empty-module"><div><div className="empty-icon"><BarChart3/></div><h2>Reports</h2><p style={{color:'var(--danger,#b42318)'}}>Unable to load report summary: {summaryState.message}</p><button className="secondary" onClick={load}><RefreshCw size={16}/> Retry</button></div></section>;

 const cards:Array<{title:string;text:string;Icon:React.ComponentType<any>}>=[{title:'Financial summary',text:'Revenue, VAT, expenses and profit',Icon:Wallet},{title:'Invoices & payments',text:'Collections and outstanding balances',Icon:Receipt},{title:'Case profitability',text:'Revenue, direct costs and margin per case',Icon:FileText},{title:'Inventory',text:'Stock value and low-stock items',Icon:Boxes},{title:'Staff activity',text:'Warehouse withdrawals and audit trail',Icon:Users},{title:'VAT',text:'Output VAT, input VAT and net payable',Icon:BarChart3}];
 const render=()=>{
  if(selected==='Financial summary')return <><div className="stats-grid"><div className="stat-card"><span>Net revenue</span><strong>€{Number(s.revenue||0).toFixed(2)}</strong></div><div className="stat-card"><span>Expenses</span><strong>€{Number(s.expenses||0).toFixed(2)}</strong></div><div className="stat-card"><span>Profit</span><strong>€{Number(s.grossProfit||0).toFixed(2)}</strong><small>{Number(s.profitMargin||0).toFixed(1)}% margin</small></div><div className="stat-card"><span>Collections</span><strong>€{Number(s.collections||0).toFixed(2)}</strong></div></div></>;
  if(selected==='Invoices & payments')return <div className="table-wrap"><table><thead><tr><th>Invoice</th><th>Patient</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead><tbody>{invoices.map(i=><tr key={i.id}><td>{i.id}</td><td>{i.patientName}</td><td>€{Number(i.amount||0).toFixed(2)}</td><td>€{Number(i.paid||0).toFixed(2)}</td><td>€{(Number(i.amount||0)-Number(i.paid||0)).toFixed(2)}</td><td>{i.status}</td></tr>)}{!invoices.length&&<tr><td colSpan={6}>No invoice data available.</td></tr>}</tbody></table></div>;
  if(selected==='Case profitability')return <div className="table-wrap"><table><thead><tr><th>Case</th><th>Patient</th><th>Revenue</th><th>Cost</th><th>Profit</th><th>Margin</th></tr></thead><tbody>{c.map(x=><tr key={x.id}><td>{x.id}</td><td>{x.patient}</td><td>€{Number(x.revenue||0).toFixed(2)}</td><td>€{Number(x.cost||0).toFixed(2)}</td><td>€{Number(x.profit||0).toFixed(2)}</td><td>{Number(x.margin||0).toFixed(1)}%</td></tr>)}{!c.length&&<tr><td colSpan={6}>No case profitability data available.</td></tr>}</tbody></table></div>;
  if(selected==='Inventory')return <div className="table-wrap"><table><thead><tr><th>Code</th><th>Item</th><th>Stock</th><th>Min</th><th>Value</th><th>Status</th></tr></thead><tbody>{items.map(i=><tr key={i.id}><td>{i.id}</td><td>{i.name}</td><td>{i.stock}</td><td>{i.minStock}</td><td>€{(Number(i.stock||0)*Number(i.unitCost||0)).toFixed(2)}</td><td>{Number(i.stock||0)<=Number(i.minStock||0)?'Low stock':'OK'}</td></tr>)}{!items.length&&<tr><td colSpan={6}>No inventory data available.</td></tr>}</tbody></table></div>;
  if(selected==='Staff activity')return <div className="table-wrap"><table><thead><tr><th>Date</th><th>Employee</th><th>Item</th><th>Movement</th><th>Patient</th><th>Case</th><th>Qty</th></tr></thead><tbody>{movements.map(m=><tr key={m.id}><td>{new Date(m.date).toLocaleString()}</td><td>{m.employeeName}</td><td>{m.itemName}</td><td>{m.type}</td><td>{m.patientId||'—'}</td><td>{m.caseId||'—'}</td><td>{m.quantity}</td></tr>)}{!movements.length&&<tr><td colSpan={7}>No stock movement data available.</td></tr>}</tbody></table></div>;
  return <><div className="stats-grid"><div className="stat-card"><span>Output VAT</span><strong>€{Number(s.outputVat||0).toFixed(2)}</strong></div><div className="stat-card"><span>Input VAT</span><strong>€{Number(s.inputVat||0).toFixed(2)}</strong></div><div className="stat-card"><span>VAT payable</span><strong>€{Number(s.vatPayable||0).toFixed(2)}</strong></div></div><p className="muted">Output VAT minus recoverable input VAT.</p></>;
 };
 return <><div className="page-heading"><div><p className="eyebrow">MANAGEMENT REPORTING</p><h1>Reports</h1><p className="muted">Live operational and financial reporting.</p></div></div>{dataErrors.length>0&&<div className="error-banner">Some report sections could not be loaded: {dataErrors.join(' · ')}</div>}<div className="report-grid">{cards.map(({title,text,Icon})=><button className={`report-card ${selected===title?'active':''}`} key={title} onClick={()=>setSelected(title)}><div className="report-icon"><Icon size={24}/></div><strong>{title}</strong><span>{text}</span></button>)}</div><section className="panel" style={{marginTop:20}}><div className="panel-header"><div><h2>{selected}</h2><p>Live data from PostgreSQL.</p></div><button className="secondary" onClick={load}><RefreshCw size={16}/> Refresh</button></div>{render()}</section></>;
}
