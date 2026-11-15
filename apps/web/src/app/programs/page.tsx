import Link from "next/link";
import { ArrowRight, Clock3, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
type Program={id:string;slug:string|null;title:string;description:string|null;start_date:string;fee_inr:number;training_days:number;internship_days:number;mode:string};
export default async function Programs(){
 let programs:Program[]=[];let error="";
 try{const supabase=await createClient();const r=await supabase.from("programs").select("id,slug,title,description,start_date,fee_inr,training_days,internship_days,mode").in("status",["published","ongoing"]).eq("is_test",false).order("start_date",{ascending:true}).limit(80);
 if(r.error)throw r.error;programs=r.data??[];}
 catch{error="Programs cannot be loaded right now. Please check back shortly.";}
 return <main className="hs-container py-16"><span className="hs-eyebrow">Explore learning programs</span><h1 className="mt-4 text-4xl font-black text-slate-950">Train with mentors. Intern with a team.</h1>
 <p className="mt-4 max-w-2xl text-slate-600">Each batch has its own schedule, mentors, weekly practical work and supervised project-based internship.</p>
 {error&&<p role="alert" className="mt-7 rounded-xl bg-amber-50 p-4 text-amber-800">{error}</p>}
 <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{programs.map(p=><article key={p.id} className="hs-card flex flex-col">
  <span className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700"><GraduationCap/></span>
  <h2 className="text-xl font-extrabold">{p.title}</h2><p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{p.description||"Mentor-led technical learning with practical project work."}</p>
  <p className="mt-6 flex items-center gap-2 text-sm text-slate-600"><Clock3 size={16}/> {p.training_days} training + {p.internship_days} internship days</p>
  <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-5"><strong className="text-xl">₹{p.fee_inr.toLocaleString("en-IN")}</strong><Link className="inline-flex items-center gap-1 font-bold text-indigo-700" href={"/programs/"+encodeURIComponent(p.slug||p.id)}>Details <ArrowRight size={17}/></Link></div>
 </article>)}</div>
 {!programs.length&&!error&&<div className="hs-card mt-10"><h2 className="font-bold">No batches open yet</h2><p className="mt-2 text-sm text-slate-600">New programs will be published here once enrollment opens.</p></div>}
 </main>;
}
