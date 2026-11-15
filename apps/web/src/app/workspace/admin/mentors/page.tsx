import { requireAdmin } from "@/lib/supabase/authorization";
import { MentorAssignForm } from "@/components/admin/mentor-assign-form";
export const dynamic="force-dynamic";
export default async function AdminMentors(){
 const {db}=await requireAdmin();
 const [programs,staff,profiles,members]=await Promise.all([
  db.from("programs").select("id,title,batch_name").order("created_at",{ascending:false}).limit(150),
  db.from("staff_roles").select("user_id,role").in("role",["mentor","trainer","guide","admin"]).limit(300),
  db.from("profiles").select("id,full_name,email").limit(500),
  db.from("program_mentors").select("program_id,mentor_id,max_internship_teams").limit(500)
 ]);
 const allowed=[...new Set((staff.data||[]).map(s=>s.user_id))].map(id=>({id,
  name:profiles.data?.find(p=>p.id===id)?.full_name||profiles.data?.find(p=>p.id===id)?.email||id.slice(0,8)}));
 return <main className="hs-container py-12"><p className="hs-eyebrow">Admin / Mentor allocation</p><h1 className="mt-3 text-3xl font-black">Assign program mentors</h1>
 <p className="mt-3 max-w-2xl text-slate-600">Every assigned mentor gets the same common program access; editing is granted by class owner or internship team owner.</p>
 <div className="hs-card mt-8"><MentorAssignForm programs={programs.data||[]} mentors={allowed}/></div>
 <section className="hs-card mt-6"><h2 className="text-xl font-bold">Current allocations</h2><div className="mt-4 space-y-3">{members.data?.length?members.data.map((m,i)=><p key={i} className="text-sm text-slate-600">{programs.data?.find(p=>p.id===m.program_id)?.title||"Program"} — {allowed.find(a=>a.id===m.mentor_id)?.name||"Mentor"} · capacity {m.max_internship_teams} teams</p>):<p className="text-sm text-slate-500">No mentors assigned yet.</p>}</div></section></main>;
}
