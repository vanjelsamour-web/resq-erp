import React,{useEffect,useState} from 'react';

type Invoice={id:string;amount:number;vatRate:number;dueDate:string;type:'CASH'|'CREDIT';status:string;paid:number};

export default function InvoiceActionsOverlay(){
  const [invoice,setInvoice]=useState<Invoice|null>(null);
  const [mode,setMode]=useState<'edit'|'delete'|null>(null);
  const [amount,setAmount]=useState('');
  const [vatRate,setVatRate]=useState('0');
  const [dueDate,setDueDate]=useState('');
  const [type,setType]=useState<'CASH'|'CREDIT'>('CREDIT');
  const [reason,setReason]=useState('');
  const [error,setError]=useState('');
  const [saving,setSaving]=useState(false);

  useEffect(()=>{
    let disposed=false;
    const enhance=()=>{
      const heading=[...document.querySelectorAll('h1')].find(x=>x.textContent?.trim()==='Invoices');
      if(!heading)return;
      document.querySelectorAll<HTMLTableRowElement>('tbody tr').forEach(row=>{
        if(row.dataset.resqInvoiceEnhanced==='1')return;
        const strong=row.querySelector('td strong');
        const cells=row.querySelectorAll('td');
        const actions=cells[cells.length-1];
        const id=strong?.textContent?.trim();
        if(!id||!actions||id==='')return;
        row.dataset.resqInvoiceEnhanced='1';
        const edit=document.createElement('button');
        edit.className='link-button'; edit.title='Correct invoice'; edit.textContent='✎'; edit.dataset.resqInvoiceAction='edit'; edit.dataset.resqInvoiceId=id;
        const del=document.createElement('button');
        del.className='link-button'; del.title='Delete invoice'; del.textContent='🗑'; del.dataset.resqInvoiceAction='delete'; del.dataset.resqInvoiceId=id;
        actions.appendChild(edit); actions.appendChild(del);
      });
    };
    const onClick=async(e:Event)=>{
      const target=e.target as HTMLElement; const btn=target.closest<HTMLElement>('[data-resq-invoice-action]');
      if(!btn)return;
      e.preventDefault();e.stopPropagation();
      const id=btn.dataset.resqInvoiceId; const action=btn.dataset.resqInvoiceAction;
      if(!id)return;
      try{
        const r=await fetch('/api/invoices'); const data=await r.json();
        const found=(Array.isArray(data)?data:[]).find((x:any)=>String(x.id)===id);
        if(!found)throw new Error('Invoice not found');
        if(disposed)return;
        setInvoice({id:String(found.id),amount:Number(found.amount||0),vatRate:Number(found.vatRate||0),dueDate:String(found.dueDate||''),type:found.type==='CASH'?'CASH':'CREDIT',status:String(found.status||''),paid:Number(found.paid||0)});
        setMode(action==='delete'?'delete':'edit'); setError(''); setReason('');
        setAmount(String(Number(found.amount||0)));setVatRate(String(Number(found.vatRate||0)));setDueDate(String(found.dueDate||''));setType(found.type==='CASH'?'CASH':'CREDIT');
      }catch(err){setError(err instanceof Error?err.message:'Unable to load invoice')}
    };
    document.addEventListener('click',onClick,true);
    const observer=new MutationObserver(enhance);observer.observe(document.body,{childList:true,subtree:true});enhance();
    return()=>{disposed=true;observer.disconnect();document.removeEventListener('click',onClick,true)};
  },[]);

  const close=()=>{if(!saving){setMode(null);setInvoice(null);setError('')}};
  const save=async(e:React.FormEvent)=>{e.preventDefault();if(!invoice)return;setSaving(true);setError('');try{
    const r=await fetch(`/api/invoices/${encodeURIComponent(invoice.id)}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:Number(amount),vatRate:Number(vatRate),dueDate,type})});
    const x=await r.json();if(!r.ok)throw new Error(x.error||'Unable to correct invoice');window.location.reload();
  }catch(err){setError(err instanceof Error?err.message:'Unable to correct invoice');setSaving(false)}};
  const remove=async()=>{if(!invoice)return;setSaving(true);setError('');try{
    const r=await fetch(`/api/invoices/${encodeURIComponent(invoice.id)}`,{method:'DELETE'});const x=await r.json();if(!r.ok)throw new Error(x.error||'Unable to delete invoice');window.location.reload();
  }catch(err){setError(err instanceof Error?err.message:'Unable to delete invoice');setSaving(false)}};

  if(!mode||!invoice)return null;
  const financialWarning=invoice.paid>0||invoice.status==='Paid';
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal" onMouseDown={e=>e.stopPropagation()}>
    <div className="modal-header"><div><p className="eyebrow">INVOICE CONTROL</p><h2>{mode==='delete'?'Delete':'Correct'} {invoice.id}</h2><p className="muted">{financialWarning?'This invoice has financial activity. Direct correction/deletion is blocked; use a credit note.':'You can correct unpaid invoices or delete invoices with no financial transactions.'}</p></div><button className="modal-close" onClick={close}>×</button></div>
    {error&&<div className="error-banner">{error}</div>}
    {mode==='delete'?<><div className="panel" style={{padding:16,marginBottom:16}}><strong>Are you sure you want to delete {invoice.id}?</strong><p className="muted">This action is permanent and will be recorded in the audit trail. Invoices with payments, receipts or credit notes cannot be deleted.</p><label>Reason<input value={reason} onChange={e=>setReason(e.target.value)} placeholder="Why is this invoice being deleted?"/></label></div><div className="form-actions"><button className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving||financialWarning||!reason.trim()} onClick={remove}>Delete invoice</button></div></>:
    <form onSubmit={save}><div className="form-grid"><label>Total amount (€)<input required type="number" min="0" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)}/></label><label>VAT rate<select value={vatRate} onChange={e=>setVatRate(e.target.value)}><option value="0">0%</option><option value="5">5%</option><option value="9">9%</option><option value="19">19%</option></select></label><label>Due date<input required type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)}/></label><label>Invoice type<select value={type} onChange={e=>setType(e.target.value as 'CASH'|'CREDIT')}><option value="CREDIT">Credit / επί πιστώσει</option><option value="CASH">Cash / μετρητοίς</option></select></label></div><div className="form-actions"><button type="button" className="secondary" onClick={close}>Cancel</button><button className="primary" disabled={saving||financialWarning}>Save correction</button></div></form>}
  </div></div>;
}
