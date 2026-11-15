import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, GraduationCap, Mic2, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function Admin(){
 const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect("/login");
 const {data:staff}=await db.from("staff_roles").select("role").eq("user_id",user.id);
 if(!staff?.some(x=>x.role==="admin"))redirect("/workspace");
 const [programs,mentors,events]=await Promise.all([
 db.from("programs").select("id,title,status,batch_name,start_date,training_days,internship_days").limit(100),
 db.from("program_mentors").select("program_id,mentor_id").limit(200),
 db.from("global_events").select("id,title,status,starts_at").order("starts_at",{ascending:false}).limit(25)
 ]);
 return <main className="hs-container py-14"><span className="hs-eyebrow">Administration</span><h1 className="mt-3 text-4xl font-black">HackSphere Control Center</h1>
 <p className="mt-3 text-slate-600">Program-level scheduling, shared mentor access, owner-only class uploads, and internships.</p>
 <div className="mt-9 grid gap-4 sm:grid-cols-3">
  <div className="hs-card"><GraduationCap className="text-indigo-600"/><p className="mt-4 text-3xl font-black">{programs.data?.length||0}</p><p className="text-sm text-slate-500">Programs</p></div>
  <div className="hs-card"><Users className="text-indigo-600"/><p className="mt-4 text-3xl font-black">{mentors.data?.length||0}</p><p className="text-sm text-slate-500">Mentor assignments</p></div>
  <div className="hs-card"><Mic2 className="text-indigo-600"/><p className="mt-4 text-3xl font-black">{events.data?.length||0}</p><p className="text-sm text-slate-500">Guest session records</p></div>
 </div>
 <section className="hs-card mt-8"><h2 className="flex items-center gap-2 text-xl font-bold"><CalendarDays className="text-indigo-600"/> Programs and batches</h2>
 <div className="mt-5 divide-y divide-slate-100">{programs.data?.length?programs.data.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-4"><div><b>{p.title}</b><p className="text-xs text-slate-500">{p.batch_name||"Batch"} · {p.training_days}+{p.internship_days} days</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{p.status}</span></div>):<p className="py-4 text-sm text-slate-500">No programs created yet.</p>}</div></section>
 <p className="mt-6 text-sm text-slate-500">The v2 atomic scheduling, mentor allocation and global events RPCs are available in the existing Supabase project. Admin editing forms are being migrated from the legacy workspace.</p>
 <Link href="/workspace" className="mt-8 inline-flex font-semibold text-indigo-600">← All workspaces</Link></main>;
}
