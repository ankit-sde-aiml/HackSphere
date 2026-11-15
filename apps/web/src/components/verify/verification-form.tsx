"use client";
import {useState,type FormEvent} from "react";
import {createClient} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
type Verification={valid:boolean;kind?:string;code?:string;holder_name?:string;program?:string;issued_at?:string;status?:string};
export function VerificationForm({initialCode}:{initialCode:string}){
 const [code,setCode]=useState(initialCode.slice(0,80)),[result,setResult]=useState<Verification|null>(null),
 [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function check(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");setResult(null);
  try{
   const clean=code.trim();if(!clean||clean.length>80)throw Error("Enter a valid document code.");
   const {data,error}=await createClient().rpc("verify_hacksphere_document",{document_code:clean});
   if(error)throw error;setResult(data as Verification);
  }catch(err){setMessage(err instanceof Error?err.message:"Verification unavailable");}
  finally{setBusy(false)}
 }
 return <form className="space-y-4" onSubmit={check}>
  <label className="block text-sm font-semibold">Document code<input value={code} onChange={e=>setCode(e.target.value)} maxLength={80} required
   placeholder="HS-CERT-..." className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-mono text-sm"/></label>
  <Button disabled={busy}>{busy?"Checking...":"Verify document"}</Button>
  {result&&<div className={"rounded-xl p-5 "+(result.valid?"bg-emerald-50":"bg-rose-50")}>
   {result.valid?<><h2 className="font-bold text-emerald-800">Document verified</h2>
    <p className="mt-2 text-sm">Holder: {result.holder_name}</p>
    <p className="mt-1 text-sm">Program: {result.program}</p>
    <p className="mt-1 text-sm">Type: {result.kind==="certificate"?"Completion certificate":"Offer letter"}</p>
    <p className="mt-1 text-sm">Status: {result.status}</p></>:
    <p className="font-semibold text-rose-800">No valid current HackSphere document was found with that code.</p>}
  </div>}
  <p role="status" className="text-sm text-slate-600">{message}</p>
 </form>;
}}
