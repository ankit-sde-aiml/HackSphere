import Link from "next/link";
import {requireAdmin} from "@/lib/supabase/authorization";
import {PaymentQueue} from "@/components/admin/payment-queue";
export const dynamic="force-dynamic";
export default async function Payments(){
 const {db}=await requireAdmin();
 const [claims,people,programs]=await Promise.all([
  db.from("payment_claims").select("id,student_id,program_id,amount_inr,utr,proof_path,created_at,status").eq("status","pending").order("created_at").limit(250),
  db.from("profiles").select("id,full_name,email").limit(1000),
  db.from("programs").select("id,title").limit(500)
 ]);
 const queue=(claims.data||[]).map(x=>({...x,
  student:people.data?.find(p=>p.id===x.student_id)?.full_name||people.data?.find(p=>p.id===x.student_id)?.email||x.student_id.slice(0,8),
  program:programs.data?.find(p=>p.id===x.program_id)?.title||"Program"
 }));
 return <main className="hs-container py-12"><span className="hs-eyebrow">Admin / Finance</span>
  <h1 className="mt-3 text-3xl font-black">UPI verification queue</h1>
  <p className="mt-3 max-w-3xl text-slate-600">Do not approve any payment without matching the actual credit in your official bank statement. A screenshot or UTR is not confirmation.</p>
  <Link href="/workspace/admin/payments/settings" className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white">Official UPI settings</Link>
  <section className="hs-card mt-7"><PaymentQueue claims={queue}/></section>
 </main>;
