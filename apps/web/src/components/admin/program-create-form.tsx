"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
export function ProgramCreateForm({courses}:{courses:{id:string;title:string}[]}){
 const router=useRouter();const [message,setMessage]=useState("");const [saving,setSaving]=useState(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setSaving(true);setMessage("");
  const form=new FormData(event.currentTarget);
  const get=(name:string)=>String(form.get(name)||"");
  const args={_title:get("title"),_description:get("description"),_start_date:get("start_date"),
   _training_days:Number(get("training_days")),_internship_days:Number(get("internship_days")),
   _fee_inr:Number(get("fee_inr")),_mode:get("mode"),_timezone:"Asia/Kolkata",
   _batch_name:get("batch_name"),_enrollment_capacity:Number(get("capacity"))||null,
   _course_catalog_id:get("course_id")||null};
  try{
   const {error}=await createClient().rpc("create_program_v2",args);
   if(error)throw error;
   setMessage("Draft batch created. Assign mentors and scheduled lessons next.");
   router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:"Could not create batch");}
  finally{setSaving(false)}
 }
 const field="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200";
 return <form onSubmit={submit} className="grid gap-5 sm:grid-cols-2">
  <label className="sm:col-span-2 text-sm font-semibold">Program title<input className={field+" mt-2"} name="title" minLength={3} required placeholder="Full Stack Development"/></label>
  <label className="text-sm font-semibold">Batch name<input className={field+" mt-2"} name="batch_name" required defaultValue="Batch 01"/></label>
  <label className="text-sm font-semibold">Existing course template<select name="course_id" className={field+" mt-2"}><option value="">Standalone program</option>{courses.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
  <label className="text-sm font-semibold">Start date<input className={field+" mt-2"} name="start_date" type="date" required/></label>
  <label className="text-sm font-semibold">Class mode<select className={field+" mt-2"} name="mode"><option>Hybrid</option><option>Live</option><option>Recorded</option></select></label>
  <label className="text-sm font-semibold">Training days<input className={field+" mt-2"} name="training_days" type="number" min={1} defaultValue={60} required/></label>
  <label className="text-sm font-semibold">Internship days<input className={field+" mt-2"} name="internship_days" type="number" min={1} defaultValue={40} required/></label>
  <label className="text-sm font-semibold">Program fee (₹)<input className={field+" mt-2"} name="fee_inr" type="number" min={0} defaultValue={0} required/></label>
  <label className="text-sm font-semibold">Enrollment capacity<input className={field+" mt-2"} name="capacity" type="number" min={5} defaultValue={50}/></label>
  <label className="sm:col-span-2 text-sm font-semibold">Description<textarea className={field+" mt-2 min-h-28"} name="description" placeholder="Topics, expected outcomes and program details"/></label>
  <div className="sm:col-span-2"><Button disabled={saving}>{saving?"Saving...":"Create draft program"}</Button><p role="status" className="mt-3 text-sm text-slate-600">{message}</p></div>
 </form>;
}
