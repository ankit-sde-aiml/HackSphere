"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
type Session={id:string;program_id:string;title:string;scheduled_date:string;activity_type:string};
type Resource={id:string;event_id:string;title:string;kind:string;published:boolean};
type Quiz={id:string;timeline_event_id:string;title:string;published:boolean};
export function LessonContentEditor({events,resources,quizzes}:{events:Session[];resources:Resource[];quizzes:Quiz[]}){
 const router=useRouter();const [eventId,setEventId]=useState(events[0]?.id||"");
 const [quizId,setQuizId]=useState("");const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 const selected=events.find(e=>e.id===eventId);
 const eventQuizzes=quizzes.filter(q=>q.timeline_event_id===eventId);
 const currentQuiz=eventQuizzes.find(q=>q.id===quizId)||eventQuizzes[0];
 const field="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm";
 async function execute(action:()=>Promise<void>){setBusy(true);setMessage("");try{await action();router.refresh();setMessage("Saved successfully.");}catch(error){setMessage(error instanceof Error?error.message:"Could not save");}finally{setBusy(false)}}
 async function addResource(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected)return;
  const form=new FormData(e.currentTarget),title=String(form.get("title")||"").trim();
  const note=String(form.get("note")||"").trim(),url=String(form.get("url")||"").trim();
  await execute(async()=>{
   const db=createClient(),{data:{user}}=await db.auth.getUser();
   if(!user)throw new Error("Sign in required");
   if(!note&&!url)throw new Error("Enter text notes or an HTTPS link");
   if(url&&!url.startsWith("https://"))throw new Error("Use an HTTPS resource link");
   const {error}=await db.from("lesson_resources").insert({
    event_id:selected.id,kind:url?"link":"notes",title,created_by:user.id,published:true,
    external_url:url||null,note_text:note||null
   });
   if(error)throw error;
  });
 }
 async function createQuiz(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!selected)return;const title=String(new FormData(e.currentTarget).get("quiz_title")||"").trim();
  await execute(async()=>{
   const db=createClient(),{data:{user}}=await db.auth.getUser();
   if(!user)throw new Error("Sign in required");
   const {error}=await db.from("quizzes").insert({
    timeline_event_id:selected.id,title,time_limit_minutes:20,max_attempts:2,published:false,created_by:user.id
   });if(error)throw error;
  });
 }
 async function addQuestion(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(!currentQuiz)return;const fd=new FormData(e.currentTarget);
  const opts=["a","b","c","d"].map(k=>String(fd.get("option_"+k)||"").trim());
  await execute(async()=>{
   if(opts.some(x=>!x))throw new Error("All four options are required");
   const {error}=await createClient().rpc("add_quiz_question",{
    _quiz_id:currentQuiz.id,_prompt:String(fd.get("question")||"").trim(),
    _options:opts,_correct_index:Number(fd.get("correct"))
   });if(error)throw error;
  });
 }
 async function publishQuiz(){if(!currentQuiz)return;await execute(async()=>{
  if(!window.confirm("Publish quiz to eligible students? Verify all questions first."))return;
  const {error}=await createClient().from("quizzes").update({published:true}).eq("id",currentQuiz.id);
  if(error)throw error;
 });}
 return <div className="space-y-8">
  <div><label className="block text-sm font-semibold">My assigned session<select value={eventId} onChange={e=>{setEventId(e.target.value);setQuizId("");}} className={field}>
  {events.map(e=><option key={e.id} value={e.id}>{e.scheduled_date} — {e.title} ({e.activity_type})</option>)}</select></label>
  {!events.length&&<p className="mt-3 text-sm text-slate-500">Admin has not scheduled a topic for you.</p>}</div>
  {selected&&<><div className="border-t border-slate-100 pt-6">
   <h2 className="text-xl font-bold">Lecture notes & resources</h2><p className="mt-2 text-sm text-slate-600">Students receive topic notes, resources and links when their class is released.</p>
   <div className="mt-4 space-y-2">{resources.filter(r=>r.event_id===eventId).map(r=><p key={r.id} className="rounded-xl bg-slate-50 p-3 text-sm">{r.title} · {r.kind} · {r.published?"Published":"Hidden"}</p>)}</div>
   <form onSubmit={addResource} className="mt-5 grid gap-4">
    <label className="text-sm font-semibold">Title<input name="title" className={field} minLength={2} required placeholder="Class notes"/></label>
    <label className="text-sm font-semibold">Text notes<textarea name="note" className={field+" min-h-24"}/></label>
    <label className="text-sm font-semibold">Optional HTTPS resource URL<input name="url" type="url" className={field} placeholder="https://..."/></label>
    <Button disabled={busy}>Publish resource</Button></form>
   <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">Cloudflare R2/Stream recorded video uploading is disabled until the service is enabled on the account. Existing Supabase secure study-material storage remains independent.</p>
  </div>
  <section className="border-t border-slate-100 pt-6"><h2 className="text-xl font-bold">Topic quizzes</h2>
   {!eventQuizzes.length?<form onSubmit={createQuiz} className="mt-4 flex flex-wrap gap-3"><input name="quiz_title" required minLength={3} className="min-w-[220px] flex-1 rounded-xl border border-slate-200 p-3" defaultValue={selected.title+" quiz"}/><Button disabled={busy}>Create draft quiz</Button></form>:
   <><label className="mt-4 block text-sm font-semibold">Quiz<select className={field} value={currentQuiz?.id} onChange={e=>setQuizId(e.target.value)}>{eventQuizzes.map(q=><option key={q.id} value={q.id}>{q.title} · {q.published?"Published":"Draft"}</option>)}</select></label>
   {!currentQuiz?.published&&<><form onSubmit={addQuestion} className="mt-5 grid gap-3"><label className="font-semibold text-sm">Question<input required name="question" className={field}/></label>
   {["a","b","c","d"].map(k=><label key={k} className="text-sm font-semibold">Option {k.toUpperCase()}<input required name={"option_"+k} className={field}/></label>)}
   <label className="text-sm font-semibold">Correct answer<select name="correct" className={field}><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></label>
   <Button disabled={busy}>Add quiz question</Button></form>
   <Button className="mt-4" variant="outline" onClick={publishQuiz} disabled={busy}>Publish quiz</Button></>}
   </>}
  </section></>}
  <p role="status" className="text-sm text-slate-600">{message}</p>
 </div>;
}
