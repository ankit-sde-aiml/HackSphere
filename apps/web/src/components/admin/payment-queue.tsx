"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
type Claim={id:string;student_id:string;program_id:string;amount_inr:number;utr:string;proof_path:string|null;created_at:string;status:string;student:string;program:string};
export function PaymentQueue({claims}:{claims:Claim[]}){
 const router=useRouter(),[busy,setBusy]=useState(""),[message,setMessage]=useState("");
 async function proof(c:Claim){
  const tab=window.open("","_blank");setBusy(c.id);setMessage("");
  try{
   if(!c.proof_path)throw Error("No payment proof was provided.");
   const {data,error}=await createClient().storage.from("hacksphere-payment-proofs").createSignedUrl(c.proof_path,180);
   if(error||!data?.signedUrl)throw error||Error("Cannot create secure proof link");
   if(tab){tab.opener=null;tab.location.replace(data.signedUrl);}
   else setMessage("Allow popups to see the proof.");
  }catch(e){tab?.close();setMessage(e instanceof Error?e.message:"Could not open proof");}
  finally{setBusy("")}
 }
 async function decide(c:Claim,next:"approved"|"rejected"){
  if(!window.confirm(next==="approved"?
   "Confirm you checked your official bank statement and ₹"+c.amount_inr+" has actually arrived for UTR "+c.utr+"?":
   "Reject this payment claim?"))return;
  const note=window.prompt("Internal review note",next==="approved"?"Verified actual bank credit":"Not verified");
  if(note===null)return;
  setBusy(c.id);setMessage("");
  try{
   const db=createClient(),{data:{user}}=await db.auth.getUser();
   if(!user)throw Error("Admin sign-in required");
   const {error}=await db.from("payment_claims").update({
    status:next,reviewed_by:user.id,reviewed_at:new Date().toISOString(),review_note:note.slice(0,1000)
   }).eq("id",c.id).eq("status","pending");
   if(error)throw error;
   setMessage(next==="approved"?"Verified enrollment approved.":"Payment claim rejected.");
   router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not save review");}
  finally{setBusy("")}
 }
 return <div><h2 className="text-lg font-bold">{claims.length} pending payment claims</h2>
 <div className="mt-5 space-y-4">
 {claims.map(c=><article className="rounded-xl border border-slate-200 p-5" key={c.id}>
  <h3 className="font-bold">{c.student}</h3><p className="mt-2 text-sm text-slate-600">{c.program} · ₹{c.amount_inr.toLocaleString("en-IN")}</p>
  <p className="mt-2 text-sm text-slate-600">UTR <span className="font-mono">{c.utr}</span> · {new Date(c.created_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</p>
  <div className="mt-4 flex flex-wrap gap-2">
   <Button size="sm" variant="outline" disabled={busy===c.id} onClick={()=>proof(c)}>View proof</Button>
   <Button size="sm" disabled={busy===c.id} onClick={()=>decide(c,"approved")}>Bank verified: Approve</Button>
   <Button size="sm" variant="outline" disabled={busy===c.id} onClick={()=>decide(c,"rejected")}>Reject</Button>
  </div>
 </article>)}
 {!claims.length&&<p className="text-sm text-slate-500">No payment claims awaiting review.</p>}
 </div><p role="status" className="mt-4 text-sm text-slate-600">{message}</p></div>;
