import {requireAdmin} from "@/lib/supabase/authorization";
import {CertificateApproval} from "@/components/admin/certificate-approval";
export const dynamic="force-dynamic";
export default async function AdminCertificates(){
 const {db}=await requireAdmin();
 const [recommendations,certificates,profiles,programs,evaluations]=await Promise.all([
  db.from("completion_recommendations").select("id,program_id,student_id,recommendation,remarks,guide_user_id").eq("recommendation","recommended").limit(300),
  db.from("certificates").select("id,program_id,student_id,code,status").limit(600),
  db.from("profiles").select("id,full_name,email").limit(1000),
  db.from("programs").select("id,title").limit(400),
  db.from("evaluations").select("id,program_id,student_id,phase,score,max_score").eq("phase","internship").limit(1500)
 ]);
 const rows=(recommendations.data||[]).map(r=>({...r,
  student:profiles.data?.find(p=>p.id===r.student_id)?.full_name||profiles.data?.find(p=>p.id===r.student_id)?.email||r.student_id.slice(0,8),
  program:programs.data?.find(p=>p.id===r.program_id)?.title||"Program",
  issued:(certificates.data||[]).find(c=>c.program_id===r.program_id&&c.student_id===r.student_id),
  evaluations:(evaluations.data||[]).filter(e=>e.program_id===r.program_id&&e.student_id===r.student_id).length
 }));
 return <main className="hs-container py-12"><span className="hs-eyebrow">Admin / Certification</span>
 <h1 className="mt-3 text-3xl font-black">Final internship certificate approvals</h1>
 <p className="mt-3 max-w-3xl text-slate-600">Mentor must recommend completion after supervised work. Admin reviews individual work evidence and evaluations before issuing a verified certificate.</p>
 <section className="hs-card mt-8"><CertificateApproval rows={rows}/></section>
 </main>;
}
