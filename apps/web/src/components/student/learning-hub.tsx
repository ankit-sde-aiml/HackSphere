"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
type Program={id:string;title:string;training_days:number;internship_days:number;start_date:string};
type Lesson={id:string;title:string;program_id:string;activity_type:string;scheduled_date:string;description:string|null};
type Resource={id:string;event_id:string;title:string;kind:string;storage_path:string|null;external_url:string|null;note_text:string|null;published:boolean};
type Quiz={id:string;timeline_event_id:string;title:string;published:boolean;max_attempts:number};
type Question={id:string;quiz_id:string;prompt:string;options:unknown;position:number};
type Attempt={quiz_id:string;score:number;max_score:number;submitted_at:string};
type Submission={id:string;event_id:string;content:string|null;submission_url:string|null;status:string};
type Team={id:string;team_number:number;mentor_id:string;project_title:string|null;project_brief:string|null;repository_url:string|null};
type Task={id:string;team_id:string;title:string;status:string;assigned_student_id:string|null};
type Event={id:string;title:string;speaker_name:string;starts_at:string;status:string};
type Props={userId:string;programs:Program[];lessons:Lesson[];resources:Resource[];quizzes:Quiz[];questions:Question[];attempts:Attempt[];submissions:Submission[];teams:Team[];tasks:Task[];events:Event[]};
export function StudentLearningHub({userId,programs,lessons,resources,quizzes,questions,attempts,submissions,teams,tasks,events}:Props){
 const router=useRouter();const [selected,setSelected]=useState(lessons[0]?.id||"");
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 const lesson=lessons.find(x=>x.id===selected),quiz=quizzes.find(q=>q.timeline_event_id===selected);
 const quizQuestions=questions.filter(q=>q.quiz_id===quiz?.id);
 const quizAttempts=attempts.filter(a=>a.quiz_id===quiz?.id);
 const submitted=submissions.find(s=>s.event_id===selected);
 const input="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm";
 async function execute(op:()=>Promise<string>){
  setBusy(true);setMessage("");
  try{const text=await op();setMessage(text);router.refresh();}
  catch(err){setMessage(err instanceof Error?err.message:"Unable to complete action");}
  finally{setBusy(false)}
 }
 async function submitQuiz(){
  if(!quiz||!quizQuestions.length)return;
  await execute(async()=>{
   const answerMap:Object=Object.fromEntries(Object.entries(answers).map(([id,index])=>[id,index]));
   const {data,error}=await createClient().rpc("submit_quiz",{_quiz_id:quiz.id,_answers:answerMap});
   if(error)throw error;
   return "Quiz submitted. Your score: "+data.score+" / "+data.max_score+" ("+data.percentage+"%).";
  });
 }
 async function submitProject(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!lesson)return;const fd=new FormData(e.currentTarget);
  await execute(async()=>{
   const data={event_id:lesson.id,student_id:userId,content:String(fd.get("content")||""),
   submission_url:String(fd.get("url")||""),status:"submitted"};
   const db=createClient();
   const r=submitted?.status==="changes_requested"?
    await db.from("submissions").update({content:data.content,submission_url:data.submission_url,status:"submitted"}).eq("id",submitted.id):
    await db.from("submissions").insert(data);
   if(r.error)throw r.error;
   return "Project submitted for mentor review.";
  });
 }
 async function openResource(resource:Resource){
  if(resource.external_url?.startsWith("https://")){window.open(resource.external_url,"_blank","noopener,noreferrer");return}
  if(!resource.storage_path)return;
  await execute(async()=>{
   const {data,error}=await createClient().storage.from("hacksphere-course-files").createSignedUrl(resource.storage_path!,600);
   if(error)throw error;window.open(data.signedUrl,"_blank","noopener,noreferrer");
   return "Secure resource link generated.";
  });
 }
 async function updateTask(taskId:string,status:"in_progress"|"review"){
  await execute(async()=>{
   const {error}=await createClient().rpc("update_my_internship_task",{_task_id:taskId,_status:status});
   if(error)throw error;return "Task progress updated.";
  });
 }
 async function joinEvent(eventId:string){
  await execute(async()=>{
   const {data,error}=await createClient().rpc("get_global_event_join_url",{_event_id:eventId});
   if(error)throw error;if(!data)throw new Error("Guest session join link not yet available");
   window.open(data,"_blank","noopener,noreferrer");return "Opening guest session.";
  });
 }
 return <div className="grid gap-6 lg:grid-cols-[310px_1fr]">
 <aside className="hs-card h-fit"><h2 className="text-xl font-bold">My topics and activities</h2>
 <p className="mt-2 text-xs text-slate-500">{programs.length} active or completed program(s)</p>
 <div className="mt-5 max-h-[650px] space-y-2 overflow-y-auto">{lessons.map(l=><button key={l.id}
 onClick={()=>{setSelected(l.id);setAnswers({});setMessage("");}}
 className={"block w-full rounded-xl p-4 text-left text-sm "+(selected===l.id?"bg-indigo-50 text-indigo-800":"bg-slate-50 text-slate-700")}>
 <span className="block font-bold">{l.title}</span>
 <span className="mt-1 block text-xs opacity-75">{l.scheduled_date} · {l.activity_type}</span></button>)}
 {!lessons.length&&<p className="text-sm text-slate-500">Your released lessons will appear here once the mentor publishes them.</p>}</div></aside>
 <div className="space-y-6">
 {lesson&&<section className="hs-card"><h2 className="text-2xl font-bold">{lesson.title}</h2>
 <p className="mt-2 text-sm text-slate-500">{lesson.scheduled_date} · {lesson.activity_type}</p>
 <p className="mt-5 whitespace-pre-wrap text-sm leading-7 text-slate-600">{lesson.description}</p>
 {resources.filter(r=>r.event_id===selected).length>0&&<div className="mt-7 border-t border-slate-100 pt-5"><h3 className="font-bold">Study materials</h3>
 {resources.filter(r=>r.event_id===selected).map(r=><div key={r.id} className="mt-3 rounded-xl bg-slate-50 p-4">
 <b className="text-sm">{r.title}</b>{r.note_text&&<p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{r.note_text}</p>}
 {(r.external_url||r.storage_path)&&<Button size="sm" variant="outline" className="mt-3" onClick={()=>openResource(r)}>Open resource</Button>}
 </div>)}</div>}
 {quiz&&<div className="mt-7 border-t border-slate-100 pt-5"><h3 className="text-lg font-bold">{quiz.title}</h3>
 <p className="mt-2 text-sm text-slate-500">Attempts: {quizAttempts.length}/{quiz.max_attempts}</p>
 {quizQuestions.map((q,i)=><fieldset key={q.id} className="mt-5 rounded-xl bg-slate-50 p-4">
 <legend className="font-bold">Q{i+1}. {q.prompt}</legend>
 {(Array.isArray(q.options)?q.options:[]).map((option,index)=><label key={index} className="mt-2 flex cursor-pointer items-center gap-3 text-sm">
 <input type="radio" name={q.id} checked={answers[q.id]===index} onChange={()=>setAnswers(a=>({...a,[q.id]:index}))}/>{String(option)}</label>)}
 </fieldset>)}
 <Button className="mt-5" disabled={busy||!quizQuestions.length||quizAttempts.length>=quiz.max_attempts} onClick={submitQuiz}>Submit quiz</Button>
 {quizAttempts.length>0&&<p className="mt-3 text-sm text-emerald-700">Latest saved score: {quizAttempts[quizAttempts.length-1].score}/{quizAttempts[quizAttempts.length-1].max_score}</p>}
 </div>}
 {["project","assignment","milestone"].includes(lesson.activity_type)&&<section className="mt-7 border-t border-slate-100 pt-5"><h3 className="text-lg font-bold">Individual work submission</h3>
 <p className="mt-1 text-sm text-slate-500">{submitted?"Status: "+submitted.status:"Submit a project GitHub repository and what you built."}</p>
 {(!submitted||submitted.status==="changes_requested")&&<form onSubmit={submitProject} className="mt-5 space-y-4">
 <label className="block text-sm font-semibold">Your work / explanation<textarea name="content" className={input+" min-h-24"} required defaultValue={submitted?.content||""}/></label>
 <label className="block text-sm font-semibold">HTTPS project link<input name="url" type="url" className={input} defaultValue={submitted?.submission_url||""} required/></label>
 <Button disabled={busy}>Submit for review</Button></form>}
 </section>}
 </section>}
 {teams.map(t=><section key={t.id} className="hs-card"><h2 className="text-xl font-bold">Internship Team {t.team_number}</h2>
 <p className="mt-3 font-semibold">{t.project_title||"Major project to be assigned"}</p>
 <p className="mt-2 text-sm text-slate-600">{t.project_brief}</p>
 {tasks.filter(task=>task.team_id===t.id).map(task=><div key={task.id} className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-4">
 <div><b>{task.title}</b><p className="mt-1 text-xs text-slate-500">{task.status}</p></div>
 {(task.assigned_student_id===null||task.assigned_student_id===userId)&&task.status!=="completed"&&<div className="flex gap-2">
 <Button size="sm" variant="outline" onClick={()=>updateTask(task.id,"in_progress")} disabled={busy}>Start</Button>
 <Button size="sm" onClick={()=>updateTask(task.id,"review")} disabled={busy}>Request review</Button></div>}
 </div>)}</section>)}
 <section className="hs-card"><h2 className="text-xl font-bold">Industry Connect — all programs</h2>
 {events.length?events.map(e=><div key={e.id} className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4"><div><b>{e.title}</b>
 <p className="mt-1 text-xs text-slate-500">{e.speaker_name} · {new Date(e.starts_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</p></div>
 <Button size="sm" variant="outline" onClick={()=>joinEvent(e.id)} disabled={busy}>Join near start</Button></div>):<p className="mt-3 text-sm text-slate-500">No guest sessions scheduled.</p>}</section>
 <p role="status" className="text-sm text-slate-600">{message}</p></div></div>;
}
