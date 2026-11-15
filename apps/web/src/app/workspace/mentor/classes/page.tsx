import { requireMentor } from "@/lib/supabase/authorization";
import { LessonContentEditor } from "@/components/mentor/lesson-content-editor";
export const dynamic="force-dynamic";
export default async function MentorClasses(){
 const {db,user}=await requireMentor();
 const {data:events}=await db.from("timeline_events")
 .select("id,program_id,title,scheduled_date,activity_type").eq("responsible_mentor_id",user.id)
 .order("scheduled_date").limit(300);
 const ids=(events||[]).map(x=>x.id);
 const [resources,quizzes]=ids.length?await Promise.all([
  db.from("lesson_resources").select("id,event_id,title,kind,published").in("event_id",ids).limit(600),
  db.from("quizzes").select("id,timeline_event_id,title,published").in("timeline_event_id",ids).limit(600)
 ]):[{data:[]},{data:[]}];
 return <main className="hs-container py-12"><p className="hs-eyebrow">Mentor / My assigned teaching</p>
 <h1 className="mt-3 text-3xl font-black">My Classes & Uploads</h1>
 <p className="mt-3 max-w-2xl text-slate-600">Only sessions assigned by Admin appear here. You can add resources and quiz questions to your own topics; other program mentors can view published content.</p>
 <div className="hs-card mt-8"><LessonContentEditor events={events||[]} resources={resources.data||[]} quizzes={quizzes.data||[]}/></div></main>;
}
