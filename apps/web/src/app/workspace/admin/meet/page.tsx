import {requireAdmin} from "@/lib/supabase/authorization";
import {MeetLinkForm} from "@/components/admin/meet-link-form";
export const dynamic="force-dynamic";
export default async function AdminMeet(){
 const {db}=await requireAdmin();
 const {data:sessions}=await db.from("live_sessions")
  .select("id,title,session_date,start_time,meet_status,status,program_id")
  .eq("status","scheduled").order("session_date").limit(300);
 return <main className="hs-container py-12"><span className="hs-eyebrow">Admin / Live classes</span>
  <h1 className="mt-3 text-3xl font-black">Connect Google Meet class links</h1>
  <p className="mt-3 max-w-3xl text-slate-600">Admin creates the class timetable first, then attaches the restricted Google Meet link for each class. Students receive the link only near the class time after enrollment checks.</p>
  <section className="hs-card mt-8"><MeetLinkForm sessions={sessions||[]}/></section>
 </main>;
}
