"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
type Member={program_id:string;student_id:string;team_number:number};
type Recommendation={id:string;program_id:string;student_id:string;recommendation:string;remarks:string|null};
export function InternshipCompletionForm({members,existing}:{members:Member[];existing:Recommendation[]}){
 const router=useRouter(),[selected,setSelected]=useState(0),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const person=members[selected],record=existing.find(r=>r.program_id===person?.program_id&&r.student_id===person?.student_id);
 const field="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm";
 async function saveScore(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!person)return;
  const fd=new FormData(e.currentTarget),score=Number(fd.get("score")),max=Number(fd.get("max_score"));
  setBusy(true);setMessage("");
  try{
   if(!Number.isFinite(score)||!Number.isFinite(max)||score<0||max<=0||score>max)throw Error("Score must be within the maximum.");
   const db=createClient(),{data:{user}}=await db.auth.getUser();if(!user)throw Error("Login required.");
   const {error}=await db.from("evaluations").insert({
    program_id:person.program_id,student_id:person.student_id,evaluator_id:user.id,
    phase:"internship",activity_title:String(fd.get("activity_title")||"Final internship assessment"),
    score,max_score:max,feedback:String(fd.get("feedback")||"")
   });
   if(error)throw error;setMessage("Individual internship evaluation saved.");router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:"Evaluation failed");}finally{setBusy(false)}
 }
 async function recommend(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!person)return;setBusy(true);setMessage("");
  const fd=new FormData(e.currentTarget),rec=String(fd.get("recommendation")||"needs_improvement"),remarks=String(fd.get("remarks")||"");
  try{
   if(!remarks.trim())throw Error("Give a brief work-evidence and performance explanation.");
   if(!window.confirm("Have you verified this student's actual supervised project work and individual participation?"))return;
   const db=createClient(),{data:{user}}=await db.auth.getUser();if(!user)throw Error("Login required");
   const obj={program_id:person.program_id,student_id:person.student_id,guide_user_id:user.id,recommendation:rec,remarks};
   const result=record?await db.from("completion_recommendations").update(obj).eq("id",record.id):
    await db.from("completion_recommendations").insert(obj);
   if(result.error)throw result.error;
   setMessage("Completion recommendation recorded for Admin review.");router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:"Recommendation unavailable");}
  finally{setBusy(false)}
 }
 return <div className="space-y-8">
  <label className="block text-sm font-semibold">Student in my allocated team
   <select className={field} value={selected} onChange={e=>{setSelected(Number(e.target.value));setMessage("");}}>
    {members.map((m,i)=><option key={m.program_id+"-"+m.student_id} value={i}>Team {m.team_number}: {m.student_id.slice(0,8)}</option>)}
   </select>
  </label>
  {!person&&<p className="text-sm text-slate-500">No internship students allocated to your teams.</p>}
  {person&&<>
   <form onSubmit={saveScore} className="grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
    <h2 className="sm:col-span-2 text-xl font-bold">Record individual evaluation</h2>
    <label className="sm:col-span-2 text-sm font-semibold">Assessment title<input className={field} name="activity_title" required defaultValue="Final internship project evaluation"/></label>
    <label className="text-sm font-semibold">Score<input className={field} name="score" type="number" min={0} max={100} defaultValue={75} required/></label>
    <label className="text-sm font-semibold">Maximum score<input className={field} name="max_score" type="number" min={1} max={100} defaultValue={100} required/></label>
    <label className="sm:col-span-2 text-sm font-semibold">Evidence and feedback<textarea className={field+" min-h-24"} name="feedback" required/></label>
    <div className="sm:col-span-2"><Button disabled={busy}>Save evaluation</Button></div>
   </form>
   <form onSubmit={recommend} className="grid gap-4 border-t border-slate-100 pt-6">
    <h2 className="text-xl font-bold">Internship completion recommendation</h2>
    <p className="text-sm text-slate-600">Current: {record?.recommendation||"Not reviewed"}. The database allows completion recommendation only after the full program has ended.</p>
    <label className="text-sm font-semibold">Result<select className={field} name="recommendation" defaultValue={record?.recommendation||"needs_improvement"}>
     <option value="needs_improvement">Needs improvement</option><option value="recommended">Recommend completion</option>
    </select></label>
    <label className="text-sm font-semibold">Verified work summary<textarea className={field+" min-h-24"} name="remarks" defaultValue={record?.remarks||""} required/></label>
    <div><Button disabled={busy}>Save recommendation</Button></div>
   </form>
  </>}
  <p role="status" className="text-sm text-slate-600">{message}</p>
 </div>;
}
