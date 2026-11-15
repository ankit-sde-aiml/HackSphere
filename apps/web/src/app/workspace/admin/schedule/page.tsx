import { requireAdmin } from "@/lib/supabase/authorization";
import { ScheduleCreateForm } from "@/components/admin/schedule-create-form";
export const dynamic="force-dynamic";
export default async function Schedule(){
 const {db}=await requireAdmin();
 const [programs,mentors,profiles,sessions]=await Promise.all([
  db.from("programs").select("id,title,batch_name,start_date,training_days,internship_days").order("start_date").limit(150),
  db.from("program_mentors").select("program_id,mentor_id").limit(600),
  db.from("profiles").select("id,full_name").limit(500),
  db.from("timeline_events").select("id,title,scheduled_date,responsible_mentor_id,activity_type").order("scheduled_date").limit(80)
 ]);
 const members=(mentors.data||[]).map(m=>({...m,name:profiles.data?.find(p=>p.id===m.mentor_id)?.full_name||"Mentor "+m.mentor_id.slice(0,8)}));
 return <main className="hs-container py-12"><p className="hs-eyebrow">Admin / Teaching calendar</p>
 <h1 className="mt-3 text-3xl font-black">Schedule classes and weekly activities</h1>
 <p className="mt-3 max-w-3xl text-slate-600">Admin selects every topic, date and responsible mentor. Weekly mini-projects go to all enrolled students in the batch, each submission is individual.</p>
 <section className="hs-card mt-8"><ScheduleCreateForm programs={programs.data||[]} mentors={members}/></section>
 <section className="hs-card mt-6"><h2 className="text-xl font-bold">Upcoming scheduled activities</h2>
 <div className="mt-5 space-y-3">{sessions.data?.length?sessions.data.map(s=><div key={s.id} className="flex flex-wrap justify-between gap-3 rounded-xl bg-slate-50 p-4"><b>{s.title}</b><span className="text-sm text-slate-600">{s.scheduled_date} · {s.activity_type} · {s.responsible_mentor_id?members.find(x=>x.mentor_id===s.responsible_mentor_id)?.name||"Assigned mentor":"Unassigned"}</span></div>):<p className="text-sm text-slate-500">No scheduled lessons yet.</p>}</div></section></main>;
}
