import { PrismaClient } from '@prisma/client';
const prisma=new PrismaClient();
export function installProcurementEnhancements(app){
 if(app.__resqProcurementInstalled)return;app.__resqProcurementInstalled=true;
 app.get('/api/suppliers',async(_req,res)=>{try{const rows=await prisma.supplier.findMany({orderBy:{name:'asc'}});res.json(rows)}catch(e){console.error(e);res.status(500).json({error:'Unable to load suppliers'})}});
 app.post('/api/suppliers',async(req,res)=>{try{const name=String(req.body?.name||'').trim();if(!name)return res.status(400).json({error:'Supplier name is required'});const s=await prisma.supplier.create({data:{name,vatNo:req.body?.vatNo||null,phone:req.body?.phone||null,email:req.body?.email||null}});res.status(201).json(s)}catch(e){console.error(e);res.status(500).json({error:'Unable to create supplier'})}});
}
