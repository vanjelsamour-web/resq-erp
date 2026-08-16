import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const movementUi = { RECEIPT:'Receipt', ISSUE:'Issue', ADJUSTMENT:'Adjustment', RETURN:'Return', WASTE:'Waste' };
const paymentMethods = { 'Bank transfer':'BANK_TRANSFER', Card:'CARD', Cash:'CASH' };
const invoiceUi = { DRAFT:'Draft', ISSUED:'Issued', PARTIALLY_PAID:'Partially paid', PAID:'Paid', OVERDUE:'Overdue' };
const money = n => Number(Number(n || 0).toFixed(2));
const num = n => Number(n || 0);
const patientName = p => `${p?.firstName || ''} ${p?.lastName || ''}`.trim();
async function nextNumber(model,prefix,field,pad=6){let n=await model.count()+1;let v=`${prefix}-${String(n).padStart(pad,'0')}`;while(await model.findUnique({where:{[field]:v}})){n++;v=`${prefix}-${String(n).padStart(pad,'0')}`}return v;}
async function audit(action,entity,entityId,details,employeeId=null){try{await prisma.auditLog.create({data:{action,entity,entityId,details,employeeId}})}catch(e){console.error('Audit enhancement log',e)}}
function itemUi(i){return {id:i.code,name:i.name,category:i.category,unit:i.unit,stock:num(i.stockQty),minStock:num(i.minStock),targetStock:num(i.targetStock),unitCost:num(i.unitCost),billablePrice:num(i.billablePrice),expiryDate:i.expiryDate?new Date(i.expiryDate).toISOString().slice(0,10):'',batchNo:i.batchNo||'',medicineId:i.medicineId||null,active:i.active,databaseId:i.id}}

export function installEnhancements(app){
  if(app.__resqEnhancementsInstalled)return;
  app.__resqEnhancementsInstalled=true;

  app.patch('/api/inventory/:code',async(req,res)=>{try{
    const current=await prisma.inventoryItem.findUnique({where:{code:req.params.code}}); if(!current)return res.status(404).json({error:'Inventory item not found'});
    const data={};
    for(const k of ['name','category','unit','batchNo']) if(req.body?.[k]!==undefined) data[k]=req.body[k]||null;
    for(const k of ['minStock','targetStock','unitCost','billablePrice']) if(req.body?.[k]!==undefined){const v=Number(req.body[k]);if(!Number.isFinite(v)||v<0)return res.status(400).json({error:`Invalid ${k}`});data[k]=v;}
    if(req.body?.expiryDate!==undefined)data.expiryDate=req.body.expiryDate?new Date(req.body.expiryDate):null;
    if(req.body?.active!==undefined)data.active=Boolean(req.body.active);
    if(req.body?.medicineId!==undefined)data.medicineId=req.body.medicineId||null;
    if(req.body?.code!==undefined && String(req.body.code).trim()!==current.code){data.code=String(req.body.code).trim();}
    const item=await prisma.inventoryItem.update({where:{id:current.id},data});
    await audit('UPDATE','Inventory',current.code,`Inventory item updated${data.code?`; new code ${data.code}`:''}`);
    res.json(itemUi(item));
  }catch(e){console.error(e);res.status(500).json({error:'Unable to update inventory item'})}});

  app.post('/api/inventory/:code/adjust',async(req,res)=>{try{
    const item=await prisma.inventoryItem.findUnique({where:{code:req.params.code}});if(!item)return res.status(404).json({error:'Inventory item not found'});
    const newQty=Number(req.body?.quantity);const reason=String(req.body?.reason||'').trim();const employeeNo=String(req.body?.employeeId||'').trim();
    if(!Number.isFinite(newQty)||newQty<0||!reason)return res.status(400).json({error:'Quantity and reason are required'});
    const employee=employeeNo?await prisma.employee.findUnique({where:{employeeNo}}):null;
    if(employeeNo&&!employee)return res.status(404).json({error:'Employee not found'});
    const oldQty=num(item.stockQty),delta=money(newQty-oldQty),movementQty=Math.abs(delta);
    if(delta===0)return res.json(itemUi(item));
    const movementNo=await nextNumber(prisma.stockMovement,'STK','movementNo',6);
    const movement=await prisma.$transaction(async tx=>{
      const m=await tx.stockMovement.create({data:{movementNo,itemId:item.id,employeeId:employee?.id||null,type:'ADJUSTMENT',quantity:movementQty,unitCost:item.unitCost,billablePrice:item.billablePrice,chargedAmount:0,reason:`${reason} | ${delta>0?'Increase':'Decrease'} ${oldQty} → ${newQty}`},include:{item:true,employee:true,patient:true,case:true}});
      const updated=await tx.inventoryItem.update({where:{id:item.id},data:{stockQty:newQty}});return {m,updated};
    });
    await audit('STOCK_ADJUSTMENT','Inventory',item.code,`Stock ${oldQty} → ${newQty}; ${reason}`,employee?.id||null);
    res.status(201).json({item:itemUi(movement.updated),movement:{id:movement.m.movementNo,type:movementUi.ADJUSTMENT,quantity:movementQty,reason}});
  }catch(e){console.error(e);res.status(500).json({error:'Unable to adjust stock'})}});

  app.get('/api/inventory/order-suggestions',async(_req,res)=>{try{
    const items=await prisma.inventoryItem.findMany({where:{active:true},orderBy:{name:'asc'}});
    const since=new Date(Date.now()-90*24*60*60*1000);
    const issues=await prisma.stockMovement.findMany({where:{type:'ISSUE',createdAt:{gte:since}},select:{itemId:true,quantity:true}});
    const byItem=new Map();for(const m of issues)byItem.set(m.itemId,(byItem.get(m.itemId)||0)+num(m.quantity));
    const rows=items.map(i=>{const stock=num(i.stockQty),target=num(i.targetStock)>0?num(i.targetStock):num(i.minStock);const avg90=(byItem.get(i.id)||0)/3;const projected=Math.ceil(Math.max(target-stock,avg90*2));return {...itemUi(i),consumption90Days:byItem.get(i.id)||0,monthlyAverage:money(avg90),suggestedQty:projected}}).filter(x=>x.suggestedQty>0);
    res.json(rows);
  }catch(e){console.error(e);res.status(500).json({error:'Unable to calculate order suggestions'})}});

  app.get('/api/purchase-orders',async(_req,res)=>{try{
    const rows=await prisma.purchaseOrder.findMany({orderBy:{orderDate:'desc'},include:{supplier:true,items:{include:{inventoryItem:true}}}});
    res.json(rows.map(o=>({id:o.orderNo,status:o.status,orderDate:o.orderDate.toISOString().slice(0,10),supplier:o.supplier?.name||'',supplierId:o.supplierId,items:o.items.map(i=>({id:i.id,code:i.inventoryItem.code,name:i.inventoryItem.name,quantity:num(i.quantity),receivedQty:num(i.receivedQty),unitCost:num(i.unitCost)}))})));
  }catch(e){console.error(e);res.status(500).json({error:'Unable to load purchase orders'})}});

  app.post('/api/purchase-orders',async(req,res)=>{try{
    const rows=Array.isArray(req.body?.items)?req.body.items:[];if(!rows.length)return res.status(400).json({error:'At least one item is required'});
    const orderNo=await nextNumber(prisma.purchaseOrder,'PO','orderNo',6);
    const po=await prisma.purchaseOrder.create({data:{orderNo,supplierId:req.body?.supplierId||null,status:'DRAFT',notes:req.body?.notes||null,items:{create:rows.map(x=>({inventoryItemId:String(x.inventoryItemId),quantity:Number(x.quantity),unitCost:Number(x.unitCost||0)}))}},include:{supplier:true,items:{include:{inventoryItem:true}}}});
    res.status(201).json({id:po.orderNo,status:po.status,supplier:po.supplier?.name||'',items:po.items.map(i=>({code:i.inventoryItem.code,name:i.inventoryItem.name,quantity:num(i.quantity),unitCost:num(i.unitCost)}))});
  }catch(e){console.error(e);res.status(500).json({error:'Unable to create purchase order'})}});

  app.post('/api/purchase-orders/:id/receive',async(req,res)=>{try{
    const po=await prisma.purchaseOrder.findUnique({where:{orderNo:req.params.id},include:{items:{include:{inventoryItem:true}}}});if(!po)return res.status(404).json({error:'Purchase order not found'});
    const received=Array.isArray(req.body?.items)?req.body.items:[];if(!received.length)return res.status(400).json({error:'Receipt items are required'});
    await prisma.$transaction(async tx=>{for(const r of received){const line=po.items.find(x=>x.id===String(r.id));if(!line)continue;const qty=Number(r.quantity);if(!Number.isFinite(qty)||qty<=0)continue;const newReceived=num(line.receivedQty)+qty;if(newReceived>num(line.quantity)+0.0001)throw new Error(`Received quantity exceeds ordered quantity for ${line.inventoryItem.code}`);const no=await nextNumber(tx.stockMovement,'STK','movementNo',6);await tx.stockMovement.create({data:{movementNo:no,itemId:line.inventoryItemId,type:'RECEIPT',quantity:qty,unitCost:line.unitCost,billablePrice:line.inventoryItem.billablePrice,chargedAmount:0,reason:`Purchase Order ${po.orderNo}`}});await tx.purchaseOrderItem.update({where:{id:line.id},data:{receivedQty:newReceived}});await tx.inventoryItem.update({where:{id:line.inventoryItemId},data:{stockQty:{increment:qty},unitCost:line.unitCost}});}
      const updated=await tx.purchaseOrder.findUnique({where:{id:po.id},include:{items:true}});const all=updated.items.every(x=>num(x.receivedQty)>=num(x.quantity));const some=updated.items.some(x=>num(x.receivedQty)>0);await tx.purchaseOrder.update({where:{id:po.id},data:{status:all?'RECEIVED':some?'PARTIALLY_RECEIVED':po.status}});
    });
    res.json({ok:true,orderNo:po.orderNo});
  }catch(e){console.error(e);res.status(400).json({error:e instanceof Error?e.message:'Unable to receive purchase order'})}});

  app.patch('/api/invoices/:id',async(req,res)=>{try{
    const inv=await prisma.invoice.findUnique({where:{invoiceNo:req.params.id},include:{payments:true,patient:true,case:true}});if(!inv)return res.status(404).json({error:'Invoice not found'});
    const paid=inv.payments.filter(p=>p.status==='COMPLETED').reduce((s,p)=>s+num(p.amount),0);
    if(paid>0 && req.body?.force!==true)return res.status(400).json({error:'This invoice has payments. Use a Credit Note for corrections.'});
    if(inv.status==='PAID' && req.body?.force!==true)return res.status(400).json({error:'Paid invoices cannot be edited directly. Use a Credit Note.'});
    const data={};for(const k of ['dueDate','notes'])if(req.body?.[k]!==undefined)data[k]=k==='dueDate'?new Date(req.body[k]):req.body[k];
    if(req.body?.type!==undefined && ['CASH','CREDIT'].includes(req.body.type))data.type=req.body.type;
    if(req.body?.amount!==undefined){const amount=Number(req.body.amount);const vatRate=Number(req.body.vatRate??inv.vatRate??0);if(!Number.isFinite(amount)||amount<0)return res.status(400).json({error:'Invalid amount'});data.amount=amount;data.vatRate=vatRate;data.vatAmount=money(amount*vatRate/100);data.netAmount=money(amount-data.vatAmount);}
    const u=await prisma.invoice.update({where:{id:inv.id},data,include:{patient:true,case:true,payments:true}});await audit('UPDATE','Invoice',u.invoiceNo,'Invoice corrected');
    const paidAfter=u.payments.filter(p=>p.status==='COMPLETED').reduce((s,p)=>s+num(p.amount),0);res.json({...u,id:u.invoiceNo,patientId:u.patient.patientNo,patientName:patientName(u.patient),caseId:u.case?.caseNo||null,date:u.issueDate.toISOString().slice(0,10),dueDate:u.dueDate.toISOString().slice(0,10),amount:num(u.amount),netAmount:num(u.netAmount),vatRate:num(u.vatRate),vatAmount:num(u.vatAmount),paid:paidAfter,status:invoiceUi[u.status]||u.status,databaseId:u.id,type:u.type});
  }catch(e){console.error(e);res.status(500).json({error:'Unable to update invoice'})}});

  app.delete('/api/invoices/:id',async(req,res)=>{try{
    const inv=await prisma.invoice.findUnique({where:{invoiceNo:req.params.id},include:{payments:true,receipts:true,creditNotes:true}});if(!inv)return res.status(404).json({error:'Invoice not found'});
    const paid=inv.payments.filter(p=>p.status==='COMPLETED').reduce((s,p)=>s+num(p.amount),0);
    if(paid>0||inv.receipts.length||inv.creditNotes.length)return res.status(400).json({error:'Invoice has financial transactions. Use a Credit Note instead of deleting it.'});
    await prisma.$transaction(async tx=>{await tx.invoice.delete({where:{id:inv.id}})});
    await audit('DELETE','Invoice',inv.invoiceNo,'Invoice deleted');
    res.json({ok:true,id:inv.invoiceNo});
  }catch(e){console.error(e);res.status(500).json({error:'Unable to delete invoice'})}});

  app.post('/api/invoices/:id/settle',async(req,res)=>{try{
    const inv=await prisma.invoice.findUnique({where:{invoiceNo:req.params.id},include:{payments:true,patient:true,case:true}});if(!inv)return res.status(404).json({error:'Invoice not found'});
    const paid=inv.payments.filter(p=>p.status==='COMPLETED').reduce((s,p)=>s+num(p.amount),0),balance=money(num(inv.amount)-paid);const amount=req.body?.amount===undefined?balance:Number(req.body.amount);const method=paymentMethods[String(req.body?.method||'Cash')];if(!Number.isFinite(amount)||amount<=0||amount>balance+0.001||!method)return res.status(400).json({error:'Invalid settlement'});
    const paymentNo=await nextNumber(prisma.payment,'PAY','paymentNo',6),receiptNo=await nextNumber(prisma.receipt,'REC','receiptNo',6);
    const result=await prisma.$transaction(async tx=>{const p=await tx.payment.create({data:{paymentNo,invoiceId:inv.id,patientId:inv.patientId,amount,method,reference:req.body?.reference||null,status:'COMPLETED'}});const r=await tx.receipt.create({data:{receiptNo,invoiceId:inv.id,paymentId:p.id,patientId:inv.patientId,amount,method}});const status=paid+amount>=num(inv.amount)-0.001?'PAID':'PARTIALLY_PAID';const i=await tx.invoice.update({where:{id:inv.id},data:{status}});return {p,r,i}});
    await audit('PAYMENT','Invoice',inv.invoiceNo,`Payment ${amount}; receipt ${receiptNo}`);
    res.status(201).json({invoiceId:inv.invoiceNo,paymentNo,receiptNo,amount,method,status:result.i.status,balance:money(balance-amount)});
  }catch(e){console.error(e);res.status(500).json({error:'Unable to settle invoice'})}});

  app.get('/api/invoices/:id/receipts',async(req,res)=>{try{const inv=await prisma.invoice.findUnique({where:{invoiceNo:req.params.id},include:{patient:true,receipts:{include:{payment:true}}}});if(!inv)return res.status(404).json({error:'Invoice not found'});res.json(inv.receipts.map(r=>({id:r.receiptNo,invoiceId:inv.invoiceNo,patient:patientName(inv.patient),amount:num(r.amount),method:r.method,issuedAt:r.issuedAt.toISOString(),paymentNo:r.payment.paymentNo})));}catch(e){res.status(500).json({error:'Unable to load receipts'})}});

  app.post('/api/invoices/:id/credit-note',async(req,res)=>{try{const inv=await prisma.invoice.findUnique({where:{invoiceNo:req.params.id}});if(!inv)return res.status(404).json({error:'Invoice not found'});const amount=Number(req.body?.amount);const reason=String(req.body?.reason||'').trim();if(!Number.isFinite(amount)||amount<=0||amount>num(inv.amount)||!reason)return res.status(400).json({error:'Valid amount and reason are required'});const no=await nextNumber(prisma.creditNote,'CN','creditNoteNo',6);const vat=money(amount*num(inv.vatRate)/100);const cn=await prisma.creditNote.create({data:{creditNoteNo:no,invoiceId:inv.id,amount,vatAmount:vat,reason}});await audit('CREDIT_NOTE','Invoice',inv.invoiceNo,`Credit Note ${no} for ${amount}: ${reason}`);res.status(201).json({id:no,invoiceId:inv.invoiceNo,amount,vatAmount:vat,reason,issuedAt:cn.issuedAt.toISOString()});}catch(e){console.error(e);res.status(500).json({error:'Unable to create credit note'})}});
}
