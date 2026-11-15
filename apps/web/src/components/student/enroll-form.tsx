"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
type Program={id:string;title:string;fee_inr:number;training_days:number;internship_days:number;start_date:string};
type Claim={id:string;program_id:string;status:string};
type Enrollment={program_id:string;status:string};
type Settings={upi_id?:string;payee?:string;qr_url?:string;instructions?:string};
export function EnrollForm({programs,claims,enrollments,settings,userId}:{programs:Program[];claims:Claim[];enrollments:Enrollment[];settings:Settings;userId:string}){
 const [id,setId]=useState(programs[0]?.id||"");
 const [busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const router=useRouter();const program=programs.find(p=>p.id===id);
 const pending=claims.some(x=>x.program_id===id&&x.status==="pending");
 const active=enrollments.some(x=>x.program_id===id&&["active","completed"].includes(x.status));
 const canPay=!!program&&program.fee_inr>0&&!pending&&!active&&!!settings.upi_id&&!!settings.payee;
 const input="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm";
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!program||!canPay)return;setBusy(true);setMessage("");
  const form=new FormData(e.currentTarget),file=form.get("proof"),utr=String(form.get("utr")||"").trim();
  let uploadedPath="";
  try{
   const validTypes:Record<string,string>={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"};
   if(utr.length<6||utr.length>100)throw Error("UPI reference should contain 6–100 characters.");
   if(!(file instanceof File)||!validTypes[file.type]||!file.size||file.size>5*1024*1024)throw Error("Upload a PNG/JPG/WebP screenshot under 5 MB.");
   const db=createClient();const {data:{user}}=await db.auth.getUser();
   if(!user||user.id!==userId)throw Error("Sign in again.");
   uploadedPath=user.id+"/"+crypto.randomUUID()+"."+validTypes[file.type];
   const uploaded=await db.storage.from("hacksphere-payment-proofs").upload(uploadedPath,file,{upsert:false,contentType:file.type});
   if(uploaded.error)throw uploaded.error;
   const {error}=await db.from("payment_claims").insert({
    program_id:program.id,student_id:user.id,utr,proof_path:uploadedPath,
    amount_inr:program.fee_inr,status:"pending"
   });
   if(error)throw error;
   setMessage("Payment claim received. Access is pending official bank-credit verification.");router.refresh();
  }catch(err){
   setMessage((err instanceof Error?err.message:"Could not submit claim.")+(uploadedPath?" The screenshot may have been stored. Contact support before retrying.":""));
  }finally{setBusy(false)}
 }
 return <div className="grid gap-8 lg:grid-cols-2">
 <section><h2 className="text-xl font-bold">Your enrollment</h2>
 <label className="mt-5 block text-sm font-semibold">Select program<select value={id} onChange={e=>{setId(e.target.value);setMessage("");}} className={input}>{programs.map(p=><option key={p.id} value={p.id}>{p.title}</option>)}</select></label>
 {program?<div className="mt-5 rounded-xl bg-indigo-50 p-5"><h3 className="font-bold">{program.title}</h3><p className="mt-2 text-sm">{program.training_days} training + {program.internship_days} internship days</p><p className="mt-4 text-2xl font-black">₹{program.fee_inr.toLocaleString("en-IN")}</p></div>:
 <p className="mt-4 text-slate-500">No enrollment programs are currently published.</p>}
 {active&&<p className="mt-5 rounded-xl bg-emerald-50 p-4 text-emerald-800">Your enrollment is active.</p>}
 {pending&&<p className="mt-5 rounded-xl bg-amber-50 p-4 text-amber-800">Payment verification pending. Do not submit a duplicate claim.</p>}
 {program?.fee_inr===0&&<p className="mt-5 text-slate-600">This is a free program. Admin-managed free enrollment is required; do not pay by UPI.</p>}
 {!settings.upi_id&&<p className="mt-5 text-amber-800">Official payment details not configured. Do not transfer money yet.</p>}
 {canPay&&<form onSubmit={submit} className="mt-6 space-y-4">
  <label className="block text-sm font-semibold">UPI transaction reference (UTR)<input className={input} name="utr" minLength={6} maxLength={100} required/></label>
  <label className="block text-sm font-semibold">Payment proof screenshot<input className={input} name="proof" type="file" accept="image/png,image/jpeg,image/webp" required/></label>
  <p className="text-xs leading-5 text-slate-500">Screenshots and UTRs alone do not verify a payment. Admin will check the official bank credit.</p>
  <Button disabled={busy}>{busy?"Submitting...":"Send payment for verification"}</Button>
 </form>}
 <p role="status" className="mt-4 text-sm text-slate-600">{message}</p></section>
 <aside className="rounded-2xl bg-slate-50 p-6"><h2 className="text-lg font-bold">Official payment instructions</h2>
 {settings.upi_id?<div className="mt-5 space-y-3 text-sm"><p><b>UPI ID:</b> {settings.upi_id}</p><p><b>Payee:</b> {settings.payee}</p>
 {settings.qr_url?.startsWith("https://")&&<img className="max-h-60 max-w-full rounded-xl border border-slate-200 bg-white p-2" src={settings.qr_url} alt="Official payment QR code"/>}
 <p className="whitespace-pre-wrap text-slate-600">{settings.instructions}</p></div>:
 <p className="mt-5 text-slate-600">Official UPI payment details have not been published.</p>}
 <p className="mt-8 border-t border-slate-200 pt-4 text-xs text-slate-500">Never pay using unverified details received in private chat.</p></aside>
 </div>;
