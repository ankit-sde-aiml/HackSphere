import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudentLearningHub } from "@/components/student/learning-hub";
export const dynamic="force-dynamic";
export default async function StudentLearning(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const {data:enrollments}=await db.from("enrollments")
 .select("program_id,status").eq("student_id",user.id).in("status",["active","completed"]).limit(50);
 const programIds=(enrollments||[]).map(e=>e.program_id);
 const [programs,lessons,resources,quizzes,questions,attempts,submissions,memberRows,events]=await Promise.all([
  programIds.length?db.from("programs").select("id,title,training_days,internship_days,start_date").in("id",programIds):Promise.resolve({data:[]}),
  programIds.length?db.from("timeline_events").select("id,title,program_id,activity_type,scheduled_date,description").in("program_id",programIds).order("scheduled_date").limit(500):Promise.resolve({data:[]}),
  db.from("lesson_resources").select("id,event_id,title,kind,storage_path,external_url,note_text,published").eq("published",true).limit(700),
  db.from("quizzes").select("id,timeline_event_id,title,published,max_attempts").eq("published",true).limit(250),
  db.from("quiz_questions").select("id,quiz_id,prompt,options,position").order("position").limit(2000),
  db.from("quiz_attempts").select("quiz_id,score,max_score,submitted_at").eq("student_id",user.id).limit(500),
  db.from("submissions").select("id,event_id,content,submission_url,status").eq("student_id",user.id).limit(500),
  db.from("internship_team_members").select("team_id").eq("student_id",user.id).limit(50),
  db.from("global_events").select("id,title,speaker_name,starts_at,status").eq("status","published").order("starts_at").limit(20)
 ]);
 const myTeamIds=(memberRows.data||[]).map(m=>m.team_id);
 const [teams,tasks]=myTeamIds.length?await Promise.all([
  db.from("internship_teams").select("id,team_number,mentor_id,project_title,project_brief,repository_url").in("id",myTeamIds),
  db.from("internship_tasks").select("id,team_id,title,status,assigned_student_id").in("team_id",myTeamIds).limit(300)
 ]):[{data:[]},{data:[]}];
 return <main className="hs-container py-12"><p className="hs-eyebrow">Student / Learning workspace</p><h1 className="mt-3 text-3xl font-black">Learn, practice and build</h1>
 <p className="mt-3 text-slate-600">Your published classes, topic quizzes and projects are released according to the enrolled batch schedule.</p>
 <div className="mt-8"><StudentLearningHub
 userId={user.id} programs={programs.data||[]} lessons={lessons.data||[]}
 resources={resources.data||[]} quizzes={quizzes.data||[]}
 questions={questions.data||[]} attempts={attempts.data||[]}
 submissions={submissions.data||[]} teams={teams.data||[]}
 tasks={tasks.data||[]} events={events.data||[]}/></div></main>;
}
