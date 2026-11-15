import { requireMentor } from "@/lib/supabase/authorization";
import { InternshipTeamEditor } from "@/components/mentor/internship-team-editor";
export const dynamic="force-dynamic";
export default async function MentorTeams(){
 const {db,user}=await requireMentor();
 const {data:teams}=await db.from("internship_teams")
 .select("id,program_id,team_number,mentor_id,project_title,project_brief,repository_url,due_date,status")
 .eq("mentor_id",user.id).limit(200);
 const ids=(teams||[]).map(t=>t.id);
 const [members,tasks]=ids.length?await Promise.all([
  db.from("internship_team_members").select("team_id,student_id").in("team_id",ids).limit(1000),
  db.from("internship_tasks").select("id,team_id,title,description,status,assigned_student_id").in("team_id",ids).limit(1000)
 ]):[{data:[]},{data:[]}];
 return <main className="hs-container py-12"><p className="hs-eyebrow">Mentor / Internship work</p><h1 className="mt-3 text-3xl font-black">My Allocated Teams</h1>
 <p className="mt-3 text-slate-600">Only teams assigned to you can be edited. Students can mark progress and request review, while you approve completion.</p>
 <section className="hs-card mt-8"><InternshipTeamEditor teams={teams||[]} members={members.data||[]} tasks={tasks.data||[]}/></section></main>;
}
