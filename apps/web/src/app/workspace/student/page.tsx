import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function Student(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const [enrollments,events,notifications,teamMembership]=await Promise.all([
  db.from("enrollments").select("program_id,status").eq("student_id",user.id).limit(50),
  db.from("global_events").select("id,title,speaker_name,starts_at,status").eq("status","published").order("starts_at",{ascending:true}).limit(10),
  db.from("notifications").select("id,title,body,created_at,read_at").eq("recipient_id",user.id).order("created_at",{ascending:false}).limit(12),
  db.from("internship_team_members").select("team_id").eq("student_id",user.id).limit(20)
 ]);
 const ids=(enrollments.data||[]).filter(x=>["active","completed"].includes(x.status)).map(x=>x.program_id);
 const {data:programs}=ids.length?await db.from("programs").select("id,title,training_days,internship_days,start_date").in("id",ids):{data:[]};
 return <main className="hs-container py-14"><span className="hs-eyebrow">Student dashboard</span><h1 className="mt-3 text-4xl font-black">My Learning Journey</h1>
 <Link href="/workspace/student/enroll" className="mr-3 mt-7 inline-flex rounded-xl border border-indigo-200 bg-white px-6 py-3 font-semibold text-indigo-700">Enroll / Pay by UPI</Link>
 <Link href="/workspace/student/certificates" className="mr-3 mt-7 inline-flex rounded-xl border border-indigo-200 bg-white px-6 py-3 font-semibold text-indigo-700">My Certificates</Link>
 <Link href="/workspace/student/live" className="mr-3 mt-7 inline-flex rounded-xl border border-indigo-200 bg-white px-6 py-3 font-semibold text-indigo-700">My Live Classes</Link>
 <Link href="/workspace/student/learning" className="mt-7 inline-flex rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700">Open My Learning, Quizzes & Internship</Link>
 <div className="mt-9 grid gap-5 md:grid-cols-2"><section className="hs-card"><h2 className="text-xl font-bold">My programs</h2><div className="mt-5 space-y-3">
 {programs?.length?programs.map(p=><div key={p.id} className="rounded-xl bg-indigo-50 p-4"><b>{p.title}</b><p className="mt-2 text-sm text-slate-600">{p.training_days} days training · {p.internship_days} days project internship</p></div>):<p className="text-sm text-slate-500">You do not have an active program yet. <Link href="/programs" className="font-semibold text-indigo-600">Browse programs</Link>.</p>}
 </div><p className="mt-6 text-sm text-slate-500">Assigned internship teams: {teamMembership.data?.length||0}</p></section>
 <section className="hs-card"><h2 className="text-xl font-bold">Industry Connect</h2><p className="mt-2 text-sm text-slate-600">Global sessions for all active enrolled learners.</p><div className="mt-5 space-y-4">{events.data?.length?events.data.map(e=><div key={e.id} className="rounded-xl bg-slate-50 p-4"><b>{e.title}</b><p className="mt-1 text-sm text-slate-500">{e.speaker_name} · {new Date(e.starts_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}</p></div>):<p className="text-sm text-slate-500">No guest sessions announced.</p>}</div></section>
 </div>
 <section className="hs-card mt-6"><h2 className="text-xl font-bold">Updates & reminders</h2><div className="mt-4 space-y-4">{notifications.data?.length?notifications.data.map(n=><div key={n.id} className="rounded-xl border border-slate-100 p-4"><b>{n.title}</b><p className="mt-1 text-sm text-slate-600">{n.body}</p><p className="mt-1 text-xs text-slate-400">{n.read_at?"Read":"Unread"}</p></div>):<p className="text-sm text-slate-500">No new notifications.</p>}</div></section>
 <Link href="/workspace" className="mt-8 inline-flex font-semibold text-indigo-600">← All workspaces</Link></main>;
}
