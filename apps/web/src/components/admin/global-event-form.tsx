"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
export function GlobalEventForm(){
 const [message,setMessage]=useState("");const [saving,setSaving]=useState(false);
 const router=useRouter();const input="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm";
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const form=new FormData(e.currentTarget);
  const val=(k:string)=>String(form.get(k)||"").trim();setMessage("");setSaving(true);
  try{
   const db=createClient();const {data:{user},error:authError}=await db.auth.getUser();
   if(authError||!user)throw new Error("Admin login required");
   const start=new Date(val("starts_at"));
   if(Number.isNaN(start.getTime()))throw new Error("Enter valid session start date/time");
   const {data,event_error}=await (async()=>{
    const r=await db.from("global_events").insert({
     title:val("title"),description:val("description")||null,speaker_name:val("speaker_name"),
     speaker_role:val("speaker_role")||null,speaker_company:val("speaker_company")||null,
     starts_at:start.toISOString(),duration_minutes:Number(val("duration_minutes"))||60,
     status:val("status"),created_by:user.id
    }).select("id").single();
    return {data:r.data,event_error:r.error};
   })();
   if(event_error)throw event_error;
   const link=val("join_url");
   if(link&&data?.id){
    const r=await db.rpc("set_global_event_join_url",{_event_id:data.id,_url:link});
    if(r.error){setMessage("Event saved, but meeting link failed: "+r.error.message);router.refresh();return;}
   }
   setMessage("Guest session created. Published sessions notify active enrolled students.");
   router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:"Could not create session");}
  finally{setSaving(false)}
 }
 return <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit}>
  <label className="sm:col-span-2 text-sm font-semibold">Session title<input required name="title" minLength={3} className={input} placeholder="Career roadmap with software engineer"/></label>
  <label className="text-sm font-semibold">Guest speaker<input required name="speaker_name" className={input}/></label>
  <label className="text-sm font-semibold">Designation<input name="speaker_role" className={input}/></label>
  <label className="text-sm font-semibold">Company<input name="speaker_company" className={input}/></label>
  <label className="text-sm font-semibold">Local date & time<input required name="starts_at" type="datetime-local" className={input}/></label>
  <label className="text-sm font-semibold">Duration (minutes)<input name="duration_minutes" type="number" min={15} max={480} defaultValue={60} className={input}/></label>
  <label className="text-sm font-semibold">Visibility<select name="status" defaultValue="draft" className={input}><option value="draft">Draft</option><option value="published">Published for all students</option></select></label>
  <label className="sm:col-span-2 text-sm font-semibold">Private Google Meet URL (HTTPS)<input name="join_url" type="url" placeholder="https://meet.google.com/..." className={input}/></label>
  <label className="sm:col-span-2 text-sm font-semibold">Agenda<textarea name="description" className={input+" min-h-24"}/></label>
  <div className="sm:col-span-2"><Button disabled={saving}>{saving?"Saving...":"Create guest session"}</Button>
  <p role="status" className="mt-3 text-sm text-slate-600">{message}</p></div>
 </form>;
}
