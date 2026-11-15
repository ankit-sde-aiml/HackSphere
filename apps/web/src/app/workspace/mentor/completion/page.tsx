import {requireMentor} from "@/lib/supabase/authorization";
import {InternshipCompletionForm} from "@/components/mentor/internship-completion-form";
export const dynamic="force-dynamic";
export default async function MentorCompletion(){
 const {db,user}=await requireMentor();
 const {data:teams}=await db.from("internship_teams").select("id,program_id,team_number")
  .eq("mentor_id",user.id).limit(150);
 const ids=(teams||[]).map(t=>t.id);
 const [members,existing]=ids.length?await Promise.all([
  db.from("internship_team_members").select("team_id,student_id,program_id").in("team_id",ids).limit(1000),
  db.from("completion_recommendations").select("id,program_id,student_id,recommendation,remarks")
   .in("program_id",[...new Set((teams||[]).map(t=>t.program_id))]).limit(1000)
 ]):[{data:[]},{data:[]}];
 const all=(members.data||[]).map(m=>({program_id:m.program_id,student_id:m.student_id,
  team_number:teams?.find(t=>t.id===m.team_id)?.team_number||0}));
 return <main className="hs-container py-12"><span className="hs-eyebrow">Mentor / Internship evaluation</span>
 <h1 className="mt-3 text-3xl font-black">Assess completed internship work</h1>
 <p className="mt-3 max-w-3xl text-slate-600">Review each student's contribution, code, project work and presentation. Certificate recommendations are accepted only at the end of the internship period.</p>
 <section className="hs-card mt-8"><InternshipCompletionForm members={all} existing={existing.data||[]}/></section>
 </main>;
}
