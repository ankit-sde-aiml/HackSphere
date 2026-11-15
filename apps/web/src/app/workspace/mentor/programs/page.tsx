import {requireMentor} from "@/lib/supabase/authorization";
export const dynamic="force-dynamic";
export default async function ProgramOverview(){
 const {db,user}=await requireMentor();
 const {data:members}=await db.from("program_mentors")
  .select("program_id").eq("mentor_id",user.id).limit(200);
 const ids=(members||[]).map(m=>m.program_id);
 const [programs,events,enrollments,evaluations]=ids.length?await Promise.all([
  db.from("programs").select("id,title,batch_name,start_date,training_days,internship_days").in("id",ids),
  db.from("timeline_events").select("id,program_id,title,scheduled_date,activity_type,responsible_mentor_id")
   .in("program_id",ids).order("scheduled_date").limit(800),
  db.from("enrollments").select("program_id,status").in("program_id",ids).limit(1000),
  db.from("evaluations").select("program_id,phase,score,max_score").in("program_id",ids).limit(1000)
 ]):[{data:[]},{data:[]},{data:[]},{data:[]}];
 const owner=events.data?.filter(e=>e.responsible_mentor_id===user.id).length||0;
 return <main className="hs-container py-12"><span className="hs-eyebrow">Mentor / Common program access</span>
  <h1 className="mt-3 text-3xl font-black">My programs — shared overview</h1>
  <p className="mt-3 max-w-3xl text-slate-600">Every mentor assigned to a program sees its schedule and student learning progress. Only the designated session owner can upload or edit class content; internship project changes are limited to team owner.</p>
  <div className="mt-8 grid gap-4 sm:grid-cols-3">
   <div className="hs-card"><b className="text-3xl">{programs.data?.length||0}</b><p className="mt-2 text-sm text-slate-500">Assigned programs</p></div>
   <div className="hs-card"><b className="text-3xl">{events.data?.length||0}</b><p className="mt-2 text-sm text-slate-500">Scheduled activities</p></div>
   <div className="hs-card"><b className="text-3xl">{owner}</b><p className="mt-2 text-sm text-slate-500">My teaching activities</p></div>
  </div>
  <div className="mt-7 space-y-6">{programs.data?.map(p=>{
   const schedule=(events.data||[]).filter(e=>e.program_id===p.id);
   const students=(enrollments.data||[]).filter(x=>x.program_id===p.id&&x.status==="active");
   const scored=(evaluations.data||[]).filter(e=>e.program_id===p.id);
   return <section key={p.id} className="hs-card">
    <div className="flex flex-wrap justify-between gap-3"><div><h2 className="text-xl font-bold">{p.title}</h2>
     <p className="mt-2 text-sm text-slate-500">{p.batch_name||"Batch"} · {p.training_days} training + {p.internship_days} internship days</p></div>
     <div className="text-right text-sm text-slate-600">{students.length} enrolled students<p>{scored.length} assessment records</p></div></div>
    <h3 className="mt-7 font-bold">Complete scheduled topics</h3>
    <div className="mt-4 max-h-72 space-y-2 overflow-auto">{schedule.map(s=><div key={s.id} className="flex flex-wrap justify-between gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm">
     <div><b>{s.title}</b><p className="mt-1 text-xs text-slate-500">{s.activity_type}</p></div>
     <div className="text-right text-xs text-slate-500">{s.scheduled_date}<p>{s.responsible_mentor_id===user.id?"My class — editable":"Shared program activity — view only"}</p></div>
    </div>)}{!schedule.length&&<p className="text-sm text-slate-500">No scheduled teaching activities yet.</p>}</div>
   </section>;
  })}</div>
 </main>;
}}
