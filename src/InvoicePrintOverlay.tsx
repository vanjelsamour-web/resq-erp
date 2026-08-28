import React,{useEffect} from 'react';

type Invoice={id:string;patientId:string;patientName:string;caseId:string|null;date:string;dueDate:string;amount:number;netAmount:number;vatRate:number;vatAmount:number;paid:number;status:string;type?:'CASH'|'CREDIT'};

const esc=(v:any)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const money=(v:number)=>`€${Number(v||0).toFixed(2)}`;
const date=(v:string)=>v?new Date(`${v}T00:00:00`).toLocaleDateString('en-GB',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
function settings(){try{return JSON.parse(localStorage.getItem('resq.settings')||'{}')}catch{return {}}}

export default function InvoicePrintOverlay(){
  useEffect(()=>{
    const onClick=async(e:MouseEvent)=>{
      const target=e.target as HTMLElement;
      const btn=target.closest<HTMLButtonElement>('button[title="Print"]');
      if(!btn)return;
      e.preventDefault();e.stopImmediatePropagation();
      const id=(btn.closest('tr')?.querySelector('td strong')?.textContent||'').trim();
      if(!id)return;
      try{const r=await fetch('/api/invoices');const data=await r.json();const inv=(Array.isArray(data)?data:[]).find((x:any)=>String(x.id)===id);if(!inv)throw new Error('Invoice not found');printInvoice(inv)}catch(err){window.alert(err instanceof Error?err.message:'Unable to prepare invoice')}};
    document.addEventListener('click',onClick,true);return()=>document.removeEventListener('click',onClick,true);
  },[]);
  return null;
}

function printInvoice(i:Invoice){
  const s=settings();
  const name=s.legalName||s.organisation||'RESQ Mobile Clinic',address=s.address||'',phone=s.phone||'',email=s.email||'',website=s.website||'resq.com.cy',registration=s.registrationNo||'',vat=s.vatNo||'',tin=s.tin||'',bank=s.bankName||'',iban=s.iban||'',terms=s.paymentTerms||'',footer=s.invoiceFooter||'Thank you for choosing RESQ Mobile Clinic.';
  const caseLabel=i.caseId?`Case ${esc(i.caseId)}`:'Medical services',balance=Math.max(Number(i.amount||0)-Number(i.paid||0),0);
  const w=window.open('','_blank','width=960,height=900');if(!w)return;
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(i.id)}</title><style>
@page{size:A4;margin:0}*{box-sizing:border-box}body{margin:0;background:#eef2f6;font-family:Arial,Helvetica,sans-serif;color:#172b3d}.sheet{width:210mm;min-height:297mm;margin:0 auto;background:#fff;padding:18mm 16mm 15mm;position:relative}.top{display:flex;justify-content:space-between;gap:30px;border-bottom:2px solid #2477d4;padding-bottom:18px}.logo{width:300px;height:auto;max-height:100px;object-fit:contain;object-position:left center}.issuer{text-align:right;font-size:10.5pt;line-height:1.55;color:#526578}.issuer strong{font-size:13pt;color:#102a43}.title{display:flex;justify-content:space-between;align-items:flex-end;margin:24px 0 20px}.title h1{margin:0;font-size:28pt;letter-spacing:.5px}.number{font-size:12pt;color:#526578;text-align:right}.number strong{display:block;font-size:15pt;color:#102a43}.grid{display:grid;grid-template-columns:1fr 1fr;gap:28px;margin-bottom:24px}.box{border:1px solid #d9e1e8;border-radius:8px;padding:13px 15px}.label{font-size:8.5pt;text-transform:uppercase;letter-spacing:1.2px;color:#718399;font-weight:700;margin-bottom:7px}.box p{margin:3px 0;font-size:10.5pt}.meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 18px}.meta span{display:block;font-size:8.5pt;color:#718399}.meta strong{font-size:10pt}.table{width:100%;border-collapse:collapse;margin-top:6px}.table th{background:#f4f7fa;text-align:left;font-size:8.5pt;text-transform:uppercase;letter-spacing:.8px;color:#62758a;padding:11px 10px;border-bottom:1px solid #d9e1e8}.table td{padding:13px 10px;border-bottom:1px solid #e8edf2;font-size:10pt}.right{text-align:right}.totals{margin-left:auto;width:290px;margin-top:18px}.totalrow{display:flex;justify-content:space-between;padding:7px 0;color:#526578;font-size:10pt}.grand{border-top:2px solid #102a43;margin-top:5px;padding-top:11px;font-size:14pt;font-weight:700;color:#102a43}.payment{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:34px}.payment h3{font-size:10pt;margin:0 0 8px;color:#102a43}.payment p{font-size:9.5pt;line-height:1.55;margin:3px 0;color:#526578}.footer{position:absolute;left:16mm;right:16mm;bottom:12mm;border-top:1px solid #d9e1e8;padding-top:9px;display:flex;justify-content:space-between;gap:20px;font-size:8.5pt;color:#718399}.accent{color:#2477d4}.muted{color:#718399}@media print{body{background:#fff}.sheet{margin:0}}</style></head><body><div class="sheet">
<div class="top"><div><img class="logo" src="/resq-logo.svg" alt="RESQ Mobile Clinic"></div><div class="issuer"><strong>${esc(name)}</strong><br>${esc(address).replace(/\n/g,'<br>')}${phone?`<br>Tel: ${esc(phone)}`:''}${email?`<br>${esc(email)}`:''}${website?`<br>${esc(website)}`:''}<br>${registration?`Company Reg. No: ${esc(registration)}<br>`:''}${vat?`VAT No: ${esc(vat)}<br>`:''}${tin?`Tax Identification No: ${esc(tin)}`:''}</div></div>
<div class="title"><div><div class="muted">FINANCIAL DOCUMENT</div><h1>INVOICE</h1></div><div class="number">Invoice No.<strong>${esc(i.id)}</strong></div></div>
<div class="grid"><div class="box"><div class="label">Bill To</div><p><strong>${esc(i.patientName)}</strong></p><p class="muted">${esc(i.patientId)}</p></div><div class="box"><div class="meta"><div><span>Issue date</span><strong>${date(i.date)}</strong></div><div><span>Due date</span><strong>${date(i.dueDate)}</strong></div><div><span>Invoice type</span><strong>${i.type==='CASH'?'Cash / μετρητοίς':'Credit / επί πιστώσει'}</strong></div><div><span>Case</span><strong>${esc(i.caseId||'—')}</strong></div></div></div></div>
<table class="table"><thead><tr><th>Description</th><th>Reference</th><th class="right">Net</th><th class="right">VAT</th><th class="right">Total</th></tr></thead><tbody><tr><td><strong>${caseLabel}</strong><br><span class="muted">RESQ Mobile Clinic healthcare services</span></td><td>${esc(i.caseId||'—')}</td><td class="right">${money(i.netAmount)}</td><td class="right">${money(i.vatAmount)}<br><span class="muted">${Number(i.vatRate||0)}%</span></td><td class="right"><strong>${money(i.amount)}</strong></td></tr></tbody></table>
<div class="totals"><div class="totalrow"><span>Net amount</span><strong>${money(i.netAmount)}</strong></div><div class="totalrow"><span>VAT</span><strong>${money(i.vatAmount)}</strong></div><div class="totalrow grand"><span>Total</span><strong>${money(i.amount)}</strong></div><div class="totalrow"><span>Paid</span><strong>${money(i.paid)}</strong></div><div class="totalrow"><span>Balance due</span><strong>${money(balance)}</strong></div></div>
<div class="payment"><div><h3>Payment details</h3>${bank?`<p><strong>Bank:</strong> ${esc(bank)}</p>`:''}${iban?`<p><strong>IBAN:</strong> ${esc(iban)}</p>`:''}${terms?`<p><strong>Terms:</strong> ${esc(terms)}</p>`:''}</div><div><h3>Notes</h3><p>${esc(footer)}</p></div></div>
<div class="footer"><span>RESQ Mobile Clinic</span><span>Invoice ${esc(i.id)} · <span class="accent">${date(i.date)}</span></span></div></div></body></html>`);
  w.document.close();setTimeout(()=>{w.focus();w.print()},250);
}
