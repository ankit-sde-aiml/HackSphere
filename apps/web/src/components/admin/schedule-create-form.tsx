"use client";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
type Program={id:string;title:string;batch_name:string|null;start_date:string;training_days:number;internship_days:number};
type Membership={program_id:string;mentor_id:string;name:string};
export function ScheduleCreateForm({programs,mentors}:{programs:Program[];mentors:Membership[]}){
 const [programId,setProgramId]=useState(programs[0]?.id||"");
 const [activity,setActivity]=useState("lecture");
 const [message,setMessage]=useState("");const [saving,setSaving]=useState(false);
 const router=useRouter();
 const choices=useMemo(()=>mentors.filter(m=>m.program_id===programId),[mentors,programId]);
 const current=programs.find(p=>p.id===programId);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const form=new FormData(event.currentTarget);
  const text=(k:string)=>String(form.get(k)||"");setSaving(true);setMessage("");
  try{
   const {error}=await createClient().rpc("create_scheduled_lesson_v2",{
    _program_id:programId,_title:text("title"),_description:text("description"),
    _scheduled_date:text("scheduled_date"),_activity_type:activity,
    _responsible_mentor_id:text("mentor_id"),
    _start_time:activity==="lecture"?text("start_time"):null,
    _duration_minutes:Number(text("duration_minutes"))||60,
    _published:true
   });
   if(error)throw error;
   setMessage("Activity saved. It is now linked to the responsible mentor.");
   event.currentTarget.reset();router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:"Could not schedule activity");}
  finally{setSaving(false)}
 }
 const field="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:ring-2 focus:ring-indigo-200";
 return <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
 <label className="text-sm font-semibold">Batch<select name="program_id" className={field} value={programId} onChange={e=>setProgramId(e.target.value)}>{programs.map(p=><option key={p.id} value={p.id}>{p.title} — {p.batch_name||"Batch"}</option>)}</select></label>
 <label className="text-sm font-semibold">Activity<select className={field} name="activity_type" value={activity} onChange={e=>setActivity(e.target.value)}><option value="lecture">Live class</option><option value="project">Weekly mini-project</option><option value="assignment">Weekly assignment</option><option value="quiz">Quiz</option><option value="resource">Learning resources</option></select></label>
 <label className="sm:col-span-2 text-sm font-semibold">Topic / activity name<input className={field} name="title" minLength={3} required placeholder="JavaScript Functions"/></label>
 <label className="text-sm font-semibold">Date<input className={field} type="date" name="scheduled_date" min={current?.start_date} required/></label>
 <label className="text-sm font-semibold">Responsible mentor<select key={programId} className={field} name="mentor_id" required>{choices.map(m=><option key={m.mentor_id} value={m.mentor_id}>{m.name}</option>)}</select></label>
 {activity==="lecture"&&<><label className="text-sm font-semibold">Class time (batch local)<input className={field} type="time" name="start_time" defaultValue="18:00" required/></label>
 <label className="text-sm font-semibold">Duration (min)<input className={field} type="number" name="duration_minutes" min={5} max={480} defaultValue={60} required/></label></>}
 <label className="sm:col-span-2 text-sm font-semibold">Learning objectives / requirements<textarea className={field+" min-h-24"} name="description"/></label>
 <div className="sm:col-span-2"><Button disabled={saving||!choices.length}>{saving?"Saving...":"Add scheduled activity"}</Button>
 <p role="status" className="mt-3 text-sm text-slate-600">{message}</p></div></form>;
}
