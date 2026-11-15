import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function ProgramDetails({params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;
 const supabase=await createClient();
 const r=await supabase.from("programs").select("id,slug,title,description,start_date,training_days,internship_days,fee_inr,mode,status").or("slug.eq."+slug+",id.eq."+slug).eq("is_test",false).in("status",["published","ongoing"]).maybeSingle();
 if(r.error||!r.data)notFound();
 const p=r.data;
 return <main className="hs-container grid gap-10 py-16 lg:grid-cols-[1fr_360px]">
 <section><span className="hs-eyebrow">Training + in-house internship</span><h1 className="mt-4 text-4xl font-black">{p.title}</h1>
 <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">{p.description||"Learn through scheduled classes, quizzes and weekly hands-on projects."}</p>
 <div className="hs-card mt-10"><h2 className="text-xl font-bold">Program learning journey</h2>
 <div className="mt-7 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-indigo-50 p-5"><b>{p.training_days} days — Training</b><p className="mt-2 text-sm leading-6 text-slate-600">Scheduled mentor sessions, recordings, notes, topic quizzes, individual mini-projects.</p></div>
 <div className="rounded-xl bg-emerald-50 p-5"><b>{p.internship_days} days — Internship</b><p className="mt-2 text-sm leading-6 text-slate-600">Five students per team, assigned mentor, a major supervised project, progress reviews.</p></div></div>
 <p className="mt-6 text-sm text-slate-600">Schedules and mentors are configured by Admin for each batch. Internship completion and certificates depend on verified work.</p></div></section>
 <aside className="hs-card h-fit"><p className="text-sm font-semibold text-slate-500">Program fee</p><p className="mt-2 text-4xl font-black">₹{Number(p.fee_inr).toLocaleString("en-IN")}</p>
 <div className="my-6 space-y-3 border-y border-slate-200 py-5 text-sm"><p>Start: {p.start_date}</p><p>Mode: {p.mode}</p><p>Duration: {p.training_days+p.internship_days} days</p></div>
 <Link className="block rounded-xl bg-indigo-600 px-5 py-3 text-center font-bold text-white" href="/login">Login to enroll</Link>
 <p className="mt-4 text-xs leading-5 text-slate-500">UPI claims require manual bank verification before access is activated.</p></aside>
 </main>;
}
