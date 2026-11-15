import { requireAdmin } from "@/lib/supabase/authorization";
import { InternshipGenerateForm } from "@/components/admin/internship-generate-form";
export const dynamic="force-dynamic";
export default async function Teams(){
 const {db}=await requireAdmin();
 const [programs,teams,mentors]=await Promise.all([
  db.from("programs").select("id,title,training_days,start_date,is_test,status").order("start_date").limit(150),
  db.from("internship_teams").select("id,program_id,team_number,mentor_id,project_title,status").limit(300),
  db.from("program_mentors").select("program_id,mentor_id,max_internship_teams,can_supervise_internship").limit(400)
 ]);
 return <main className="hs-container py-12"><p className="hs-eyebrow">Admin / Internship management</p>
 <h1 className="mt-3 text-3xl font-black">Automatic five-student team allocation</h1>
 <p className="mt-3 max-w-3xl text-slate-600">After training completes, the system forms teams of five, balances assignment across available mentors and prevents over-capacity allocations. Remaining students are flagged for Admin review, not silently excluded.</p>
 <section className="hs-card mt-8"><InternshipGenerateForm programs={programs.data||[]}/></section>
 <section className="hs-card mt-6"><h2 className="text-xl font-bold">Assigned internship groups</h2>
 <div className="mt-5 space-y-3">{teams.data?.length?teams.data.map(t=><div key={t.id} className="rounded-xl bg-slate-50 p-4"><b>{programs.data?.find(p=>p.id===t.program_id)?.title||"Program"} — Team {t.team_number}</b>
 <p className="mt-1 text-sm text-slate-500">{t.project_title||"Major project pending"} · {t.status}</p>
 <p className="mt-1 text-xs text-slate-500">Assigned mentor: {t.mentor_id.slice(0,8)}</p></div>):<p className="text-sm text-slate-500">No internship groups allocated yet.</p>}</div></section>
 <p className="mt-5 text-xs text-slate-500">Mentor allocations configured: {mentors.data?.length||0}</p></main>;
}
