"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
type Program={id:string;title:string;batch_name:string|null};
type Mentor={id:string;name:string};
export function MentorAssignForm({programs,mentors}:{programs:Program[];mentors:Mentor[]}){
 const [message,setMessage]=useState("");const [saving,setSaving]=useState(false);const router=useRouter();
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=new FormData(e.currentTarget);setSaving(true);setMessage("");
  try{const {error}=await createClient().from("program_mentors").upsert({
   program_id:String(form.get("program_id")),mentor_id:String(form.get("mentor_id")),
   max_internship_teams:Number(form.get("capacity")),
   can_supervise_internship:form.get("internship")==="on"
  },{onConflict:"program_id,mentor_id"});
  if(error)throw error;setMessage("Mentor assigned successfully.");router.refresh();}
  catch(err){setMessage(err instanceof Error?err.message:"Assignment failed");}finally{setSaving(false)}
 }
 const field="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm";
 return <form className="grid gap-4 md:grid-cols-3" onSubmit={submit}>
 <label className="text-sm font-semibold">Program / batch<select className={field} name="program_id" required>{programs.map(p=><option key={p.id} value={p.id}>{p.title} — {p.batch_name||"Batch"}</option>)}</select></label>
 <label className="text-sm font-semibold">Verified mentor account<select className={field} name="mentor_id" required>{mentors.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
 <label className="text-sm font-semibold">Max internship teams<input className={field} name="capacity" type="number" min={0} max={50} defaultValue={5} required/></label>
 <label className="flex items-center gap-2 text-sm font-semibold"><input name="internship" type="checkbox" defaultChecked/> Eligible to supervise internship teams</label>
 <div className="md:col-span-3"><Button disabled={saving||!programs.length||!mentors.length}>{saving?"Saving...":"Assign mentor"}</Button><p className="mt-2 text-sm text-slate-600" role="status">{message}</p></div></form>;
}
