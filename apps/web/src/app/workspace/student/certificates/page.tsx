import {redirect} from "next/navigation";
import Link from "next/link";
import {createClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function MyCertificates(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const [certificates,enrollments,programs]=await Promise.all([
  db.from("certificates").select("id,code,program_id,status,issued_at,issued_name").eq("student_id",user.id).limit(100),
  db.from("enrollments").select("id,program_id,offer_letter_code,status").eq("student_id",user.id).limit(100),
  db.from("programs").select("id,title").limit(300)
 ]);
 const title=(id:string)=>programs.data?.find(p=>p.id===id)?.title||"Program";
 return <main className="hs-container py-12">
  <span className="hs-eyebrow">Student / Achievements</span><h1 className="mt-3 text-3xl font-black">My verified documents</h1>
  <p className="mt-3 text-slate-600">Your certificate or offer letter contains a unique code. Anyone can check authenticity on the public verification page.</p>
  <section className="hs-card mt-8"><h2 className="text-xl font-bold">Internship certificates</h2>
   <div className="mt-5 space-y-3">{certificates.data?.length?certificates.data.map(c=><article key={c.id} className="rounded-xl bg-slate-50 p-4">
    <h3 className="font-bold">{title(c.program_id)}</h3><p className="mt-2 text-sm text-slate-600">{c.status} · Issued {new Date(c.issued_at).toLocaleDateString("en-IN")}</p>
    <p className="mt-2 font-mono text-sm">{c.code}</p>
    <Link href={"/verify?code="+encodeURIComponent(c.code)} className="mt-3 inline-flex text-sm font-semibold text-indigo-700">Verify certificate</Link>
   </article>):<p className="text-sm text-slate-500">Verified internship certificates appear after successful project completion and Admin approval.</p>}</div>
  </section>
  <section className="hs-card mt-6"><h2 className="text-xl font-bold">Enrollment offer letters</h2>
  <div className="mt-5 space-y-3">{enrollments.data?.filter(e=>["active","completed"].includes(e.status)).map(e=><article key={e.id} className="rounded-xl bg-slate-50 p-4">
    <b>{title(e.program_id)}</b><p className="mt-2 font-mono text-sm">{e.offer_letter_code}</p>
    <Link href={"/verify?code="+encodeURIComponent(e.offer_letter_code)} className="mt-2 inline-flex text-sm font-semibold text-indigo-700">Verify enrollment document</Link>
  </article>)}</div></section>
 </main>;
}}
