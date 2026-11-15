import {requireMentor} from "@/lib/supabase/authorization";
import {LiveClassList} from "@/components/live/live-class-list";
export const dynamic="force-dynamic";
export default async function MentorLive(){
 const {db,user}=await requireMentor();
 const {data:members}=await db.from("program_mentors").select("program_id").eq("mentor_id",user.id);
 const ids=(members||[]).map(x=>x.program_id);
 const {data:sessions}=ids.length?await db.from("live_sessions")
  .select("id,title,session_date,start_time,duration_minutes,meet_status,status")
  .in("program_id",ids).eq("status","scheduled").order("session_date").limit(300):{data:[]};
 return <main className="hs-container py-12"><span className="hs-eyebrow">Mentor / Program calendar</span>
  <h1 className="mt-3 text-3xl font-black">Live class schedule</h1>
  <p className="mt-3 text-slate-600">All program mentors share the calendar; Admin controls class ownership. Join available scheduled meetings below.</p>
  <section className="hs-card mt-8"><LiveClassList sessions={sessions||[]}/></section>
 </main>;
}}
