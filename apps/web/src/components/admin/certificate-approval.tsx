"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
type Certificate={id:string;program_id:string;student_id:string;code:string;status:string};
type Row={id:string;program_id:string;student_id:string;recommendation:string;remarks:string|null;guide_user_id:string;student:string;program:string;issued?:Certificate;evaluations:number};
export function CertificateApproval({rows}:{rows:Row[]}){
 const [busy,setBusy]=useState(""),[message,setMessage]=useState("");
 const router=useRouter();
 async function approve(r:Row){
  if(!r.evaluations){setMessage("An individual internship evaluation is required before issuing a certificate.");return}
  if(!window.confirm("Do you confirm that the student completed genuine supervised internship work, was individually evaluated, and has a valid mentor recommendation?"))return;
  setBusy(r.id);setMessage("");
  try{
   const db=createClient(),{data:{user}}=await db.auth.getUser();
   if(!user)throw Error("Sign in again");
   const {error}=await db.from("certificates").insert({
    program_id:r.program_id,student_id:r.student_id,approved_by:user.id
   });if(error)throw error;
   setMessage("Verified certificate issued. Public code is available on the student's profile.");router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:"Could not issue certificate");}
  finally{setBusy("")}
 }
 return <div><h2 className="text-xl font-bold">Eligible mentor recommendations</h2>
 <div className="mt-5 space-y-4">{rows.map(r=><article key={r.id} className="rounded-xl border border-slate-200 p-5">
  <h3 className="font-bold">{r.student} · {r.program}</h3>
  <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{r.remarks||"No work summary provided."}</p>
  <p className="mt-3 text-sm text-slate-500">Recorded internship evaluations: {r.evaluations}</p>
  {r.issued?<p className="mt-4 text-sm font-semibold text-emerald-700">Certificate {r.issued.code} · {r.issued.status}</p>:
   <Button className="mt-4" disabled={busy===r.id||!r.evaluations} onClick={()=>approve(r)}>Approve verified certificate</Button>}
 </article>)}
 {!rows.length&&<p className="text-sm text-slate-500">No completion recommendations have been approved by mentors yet.</p>}
 </div><p role="status" className="mt-5 text-sm text-slate-600">{message}</p></div>;
}
