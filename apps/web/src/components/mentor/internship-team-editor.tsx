"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
type Team={id:string;program_id:string;team_number:number;project_title:string|null;project_brief:string|null;repository_url:string|null;due_date:string|null;status:string};
type Member={team_id:string;student_id:string};
type Task={id:string;team_id:string;title:string;description:string|null;status:string;assigned_student_id:string|null};
export function InternshipTeamEditor({teams,members,tasks}:{teams:Team[];members:Member[];tasks:Task[]}){
 const [teamId,setTeamId]=useState(teams[0]?.id||""),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 const router=useRouter(),team=teams.find(t=>t.id===teamId);
 const teamMembers=members.filter(m=>m.team_id===teamId),teamTasks=tasks.filter(t=>t.team_id===teamId);
 const input="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm";
 async function mutate(fn:()=>Promise<void>){setBusy(true);setMessage("");try{await fn();setMessage("Changes saved.");router.refresh();}catch(err){setMessage(err instanceof Error?err.message:"Unable to save");}finally{setBusy(false)}}
 async function saveProject(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!team)return;const fd=new FormData(e.currentTarget);
  await mutate(async()=>{
   const {error}=await createClient().from("internship_teams").update({
    project_title:String(fd.get("project_title")||"")||null,
    project_brief:String(fd.get("project_brief")||"")||null,
    repository_url:String(fd.get("repository_url")||"")||null,
    due_date:String(fd.get("due_date")||"")||null
   }).eq("id",team.id);
   if(error)throw error;
  });
 }
 async function createTask(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!team)return;const fd=new FormData(e.currentTarget);
  await mutate(async()=>{
   const db=createClient(),{data:{user}}=await db.auth.getUser();if(!user)throw new Error("Login required");
   const {error}=await db.from("internship_tasks").insert({
    team_id:team.id,created_by:user.id,title:String(fd.get("title")||""),
    description:String(fd.get("description")||"")||null,
    assigned_student_id:String(fd.get("student_id")||"")||null
   });if(error)throw error;
  });
 }
 async function completeTask(taskId:string){
  await mutate(async()=>{
   const {error}=await createClient().from("internship_tasks").update({status:"completed"}).eq("id",taskId);
   if(error)throw error;
  });
 }
 return <div className="space-y-8">
 <label className="block text-sm font-semibold">Assigned internship group<select value={teamId} onChange={e=>setTeamId(e.target.value)} className={input}>
 {teams.map(t=><option key={t.id} value={t.id}>Team {t.team_number} — {t.project_title||"Project pending"}</option>)}</select></label>
 {!team&&<p className="text-sm text-slate-500">No internship group has been allocated to you.</p>}
 {team&&<><section className="border-t border-slate-100 pt-6"><h2 className="text-xl font-bold">Major project</h2>
 <p className="mt-2 text-sm text-slate-600">{teamMembers.length} assigned student(s). Team-based project with individual contribution evidence.</p>
 <form onSubmit={saveProject} key={team.id} className="mt-5 grid gap-4 sm:grid-cols-2">
 <label className="sm:col-span-2 text-sm font-semibold">Project title<input name="project_title" className={input} defaultValue={team.project_title||""}/></label>
 <label className="sm:col-span-2 text-sm font-semibold">Project brief<textarea name="project_brief" className={input+" min-h-24"} defaultValue={team.project_brief||""}/></label>
 <label className="text-sm font-semibold">GitHub repository<input name="repository_url" type="url" className={input} defaultValue={team.repository_url||""}/></label>
 <label className="text-sm font-semibold">Deadline<input name="due_date" type="date" className={input} defaultValue={team.due_date||""}/></label>
 <div className="sm:col-span-2"><Button disabled={busy}>Save project</Button></div></form></section>
 <section className="border-t border-slate-100 pt-6"><h2 className="text-xl font-bold">Individual and team tasks</h2>
 <div className="mt-5 space-y-3">{teamTasks.map(t=><div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
 <div><b>{t.title}</b><p className="mt-1 text-xs text-slate-500">{t.status} · {t.assigned_student_id?t.assigned_student_id.slice(0,8):"Whole team"}</p></div>
 {t.status!=="completed"&&<Button size="sm" variant="outline" onClick={()=>completeTask(t.id)} disabled={busy}>Approve complete</Button>}</div>)}
 {!teamTasks.length&&<p className="text-sm text-slate-500">No tasks assigned yet.</p>}</div>
 <form onSubmit={createTask} className="mt-6 grid gap-4">
 <label className="text-sm font-semibold">Task title<input className={input} name="title" minLength={3} required/></label>
 <label className="text-sm font-semibold">Instructions<textarea className={input} name="description"/></label>
 <label className="text-sm font-semibold">Assign to<select name="student_id" className={input}><option value="">Whole team</option>{teamMembers.map(m=><option key={m.student_id} value={m.student_id}>{m.student_id.slice(0,8)}</option>)}</select></label>
 <Button disabled={busy}>Create task</Button></form></section></>}
 <p role="status" className="text-sm text-slate-600">{message}</p></div>;
}
