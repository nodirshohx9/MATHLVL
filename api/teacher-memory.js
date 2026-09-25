import {memoryRequest} from '../lib/memory.js';
export default async function handler(req,res){
  res.setHeader('Cache-Control','private, no-store');
  if(!['GET','DELETE'].includes(req.method))return res.status(405).json({error:'Method not allowed'});
  if(req.method==='DELETE' && req.headers.origin && req.headers.origin!==`https://${req.headers.host}`)return res.status(403).json({error:'Forbidden'});
  try{const data=await memoryRequest(req.headers.cookie,req.method==='GET'?'read':'clear');return res.status(200).json(data);}
  catch{return res.status(503).json({error:'Suhbat xotirasi hozir mavjud emas.'});}
}
