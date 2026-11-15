import Link from "next/link";
import { redirect } from "next/navigation";
import { BookOpen, CalendarClock, FolderKanban, ShieldCheck, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function Workspace(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const [{data:staff},{data:mentorMemberships},{data:enrollments}]=await Promise.all([
  db.from("staff_roles").select("role").eq("user_id",user.id),
  db.from("program_mentors").select("program_id,max_internship_teams").eq("mentor_id",user.id),
  db.from("enrollments").select("program_id,status").eq("student_id",user.id)
 ]);
 const isAdmin=!!staff?.some(r=>r.role==="admin");
 const isMentor=!!mentorMemberships?.length||!!staff?.some(r=>["mentor","trainer","guide"].includes(r.role));
 const enrolled=(enrollments||[]).filter(e=>["active","completed"].includes(e.status));
 return <main className="hs-container py-14">
 <div className="flex flex-wrap items-start justify-between gap-5">
 <div><span className="hs-eyebrow">My HackSphere workspace</span><h1 className="mt-3 text-4xl font-black">Welcome back</h1>
 <p className="mt-3 text-slate-600">{user.email} · Your training, mentor responsibilities and progress in one place.</p></div>
 <div className="flex gap-2">{isAdmin&&<span className="rounded-full bg-indigo-100 px-4 py-2 text-sm font-bold text-indigo-700">Admin</span>}{isMentor&&<span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">Mentor</span>}</div></div>
 <div className="mt-10 grid gap-5 md:grid-cols-3">
  <div className="hs-card"><BookOpen className="text-indigo-600"/><p className="mt-4 text-3xl font-black">{enrolled.length}</p><p className="mt-2 text-sm text-slate-500">Active/completed enrollments</p></div>
  <div className="hs-card"><Users className="text-indigo-600"/><p className="mt-4 text-3xl font-black">{mentorMemberships?.length||0}</p><p className="mt-2 text-sm text-slate-500">Assigned mentor programs</p></div>
  <div className="hs-card"><CalendarClock className="text-indigo-600"/><p className="mt-4 text-lg font-bold">Industry Connect</p><p className="mt-2 text-sm text-slate-500">Global guest events for all enrolled learners</p></div>
 </div>
 <section className="mt-12"><h2 className="text-2xl font-bold">My spaces</h2><div className="mt-5 grid gap-4 md:grid-cols-3">
  <Link href="/workspace/student" className="hs-card block hover:border-indigo-300"><BookOpen className="text-indigo-600"/><h3 className="mt-4 text-lg font-bold">Student dashboard</h3><p className="mt-2 text-sm text-slate-600">Training schedule, learning content, global events and team projects.</p></Link>
  {isMentor&&<Link href="/workspace/mentor" className="hs-card block hover:border-indigo-300"><FolderKanban className="text-emerald-600"/><h3 className="mt-4 text-lg font-bold">Mentor workspace</h3><p className="mt-2 text-sm text-slate-600">My assigned classes, topics and internship teams.</p></Link>}
  {isAdmin&&<Link href="/workspace/admin" className="hs-card block hover:border-indigo-300"><ShieldCheck className="text-indigo-600"/><h3 className="mt-4 text-lg font-bold">Admin control center</h3><p className="mt-2 text-sm text-slate-600">Programs, mentorship, schedule, enrollment and events.</p></Link>}
 </div></section></main>;
}
