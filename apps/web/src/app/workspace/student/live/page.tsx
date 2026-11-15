import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {LiveClassList} from "@/components/live/live-class-list";
export const dynamic="force-dynamic";
export default async function StudentLive(){
 const db=await createClient(),{data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const {data:enrollments}=await db.from("enrollments").select("program_id")
  .eq("student_id",user.id).in("status",["active","completed"]).limit(100);
 const ids=(enrollments||[]).map(x=>x.program_id);
 const {data:sessions}=ids.length?await db.from("live_sessions")
  .select("id,title,session_date,start_time,duration_minutes,meet_status,status")
  .in("program_id",ids).eq("status","scheduled").order("session_date").limit(300):{data:[]};
 return <main className="hs-container py-12"><span className="hs-eyebrow">Student / Live training</span>
  <h1 className="mt-3 text-3xl font-black">Google Meet classes</h1>
  <p className="mt-3 text-slate-600">See scheduled classes across your enrolled programs. Joining link is released near scheduled class time.</p>
  <section className="hs-card mt-8"><LiveClassList sessions={sessions||[]}/></section>
 </main>;
}}
