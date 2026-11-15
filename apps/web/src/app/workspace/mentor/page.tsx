import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function Mentor(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:membership}=await db.from("program_mentors").select("program_id").eq("mentor_id",user.id);
 const {data:staff}=await db.from("staff_roles").select("role").eq("user_id",user.id);
 if(!membership?.length&&!staff?.some(x=>["admin","mentor","trainer","guide"].includes(x.role)))redirect("/workspace");
 const [sessions,teams]=await Promise.all([
  db.from("timeline_events").select("id,title,scheduled_date,activity_type,program_id").eq("responsible_mentor_id",user.id).order("scheduled_date",{ascending:true}).limit(100),
  db.from("internship_teams").select("id,team_number,project_title,program_id").eq("mentor_id",user.id).limit(100)
 ]);
 return <main className="hs-container py-14"><span className="hs-eyebrow">Mentor workspace</span><h1 className="mt-3 text-4xl font-black">My Assigned Work</h1>
 <p className="mt-4 text-slate-600">Everyone assigned to a program has its common overview. Only work owned by you appears here.</p>
 <div className="mt-8 flex flex-wrap gap-3">
  <Link href="/workspace/mentor/classes" className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white">Manage my classes, notes and quizzes</Link>
  <Link href="/workspace/mentor/teams" className="rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700">Manage my internship teams</Link>
 </div>
 <div className="mt-9 grid gap-6 md:grid-cols-2">
 <section className="hs-card"><h2 className="text-xl font-bold">My classes & weekly activities</h2>
 <div className="mt-5 space-y-4">{sessions.data?.length?sessions.data.map(s=><div key={s.id} className="rounded-xl bg-slate-50 p-4"><b>{s.title}</b><p className="mt-1 text-xs text-slate-500">{s.scheduled_date} · {s.activity_type}</p></div>):<p className="text-sm text-slate-500">No teaching activities assigned yet.</p>}</div>
 </section>
 <section className="hs-card"><h2 className="text-xl font-bold">My internship teams</h2><div className="mt-5 space-y-4">{teams.data?.length?teams.data.map(t=><div key={t.id} className="rounded-xl bg-slate-50 p-4"><b>Team {t.team_number}</b><p className="mt-1 text-xs text-slate-500">{t.project_title||"Major project pending"}</p></div>):<p className="text-sm text-slate-500">No project teams assigned yet.</p>}</div></section>
 </div>
 <Link href="/workspace" className="mt-8 inline-flex font-semibold text-indigo-600">← All workspaces</Link></main>;
}
