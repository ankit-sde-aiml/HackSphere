import Link from "next/link";
import { notFound } from "next/navigation";
import { Award, BadgeCheck, GraduationCap } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PrintCertificateButton } from "@/components/certificates/print-button";
export const dynamic="force-dynamic";
type Verification={valid:boolean;kind?:string;code?:string;holder_name?:string;program?:string;issued_at?:string;status?:string};
export default async function Certificate({params}:{params:Promise<{code:string}>}){
 const {code}=await params;
 if(!code||code.length>80||!/^[A-Za-z0-9_-]+$/.test(code))notFound();
 const db=await createClient();
 const {data,error}=await db.rpc("verify_hacksphere_document",{document_code:code});
 const v=data as Verification | null;
 if(error||!v?.valid||v.kind!=="certificate"||v.status!=="approved"||v.code!==code)notFound();
 const issued=v.issued_at?new Date(v.issued_at).toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"}):"";
 return <main className="hs-container py-10">
  <div className="mb-7 flex flex-wrap items-center justify-between gap-3 print:hidden">
   <Link href={"/verify?code="+encodeURIComponent(code)} className="font-semibold text-indigo-700">← Verify certificate</Link>
   <PrintCertificateButton />
  </div>
  <article aria-label="Verified HackSphere internship completion certificate" className="hs-print-certificate relative mx-auto flex min-h-[600px] max-w-[1040px] flex-col justify-between overflow-hidden rounded-2xl border-[12px] border-indigo-950 bg-white px-8 py-12 shadow-xl sm:px-16">
   <div className="pointer-events-none absolute -right-14 -top-14 size-72 rounded-full border-[50px] border-indigo-50/70" />
   <div className="relative text-center">
    <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-indigo-950 text-white"><GraduationCap size={38}/></div>
    <p className="mt-4 text-2xl font-black tracking-wide text-indigo-950">HackSphere</p>
    <p className="mt-1 text-xs font-bold uppercase tracking-[0.3em] text-indigo-600">Learn · Practice · Build · Intern</p>
    <div className="my-9 h-px bg-indigo-100"/>
    <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-600">Verified completion certificate</p>
    <h1 className="mt-4 text-3xl font-black tracking-tight text-indigo-950 sm:text-4xl">In-House Project Internship</h1>
    <p className="mt-8 text-sm text-slate-500">This certificate is issued to</p>
    <h2 className="mx-auto mt-2 max-w-3xl border-b border-indigo-200 pb-3 text-3xl font-black text-slate-900 sm:text-4xl">{v.holder_name||"Verified Student"}</h2>
    <p className="mx-auto mt-7 max-w-2xl text-base leading-8 text-slate-600">
     for successfully completing the supervised in-house project internship requirements associated with the
     <strong className="text-slate-950"> {v.program}</strong> program, including assigned project work and mentor evaluation.
    </p>
   </div>
   <div className="relative mt-11">
    <div className="flex flex-wrap items-center justify-between gap-6 border-t border-indigo-100 pt-8">
     <div><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Issued on</p>
      <p className="mt-2 font-semibold text-slate-800">{issued}</p></div>
     <div className="flex items-center gap-2 text-emerald-700"><BadgeCheck size={27}/><span className="text-sm font-bold">Digitally verified</span></div>
     <div className="text-right"><p className="text-xs font-bold uppercase tracking-widest text-slate-400">Certificate code</p>
      <p className="mt-2 break-all font-mono text-xs font-semibold text-slate-800">{code}</p></div>
    </div>
    <p className="mt-7 text-center text-xs leading-5 text-slate-500">
     Authenticity can be checked at the HackSphere certificate verification page. This is an in-house program certificate, not a government or third-party employer credential.
    </p>
   </div>
  </article>
  <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-slate-500 print:hidden">Only approved and currently valid certificates can be printed. Verify using the unique code before relying on this credential.</p>
 </main>;
}
