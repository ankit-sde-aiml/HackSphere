import { requireAdmin } from "@/lib/supabase/authorization";
import { GlobalEventForm } from "@/components/admin/global-event-form";
export const dynamic="force-dynamic";
export default async function Events(){
 const {db}=await requireAdmin();
 const {data:events}=await db.from("global_events").select("id,title,speaker_name,speaker_company,starts_at,status").order("starts_at",{ascending:false}).limit(100);
 return <main className="hs-container py-12">
 <p className="hs-eyebrow">Admin / Platform-wide events</p><h1 className="mt-3 text-3xl font-black">Industry Connect sessions</h1>
 <p className="mt-3 text-slate-600">No fixed weekly requirement. Admin schedules an event whenever a suitable expert is available. Every active enrolled student can attend, regardless of program.</p>
 <section className="hs-card mt-8"><GlobalEventForm/></section>
 <section className="hs-card mt-6"><h2 className="text-xl font-bold">Event history and upcoming sessions</h2>
 <div className="mt-5 space-y-3">{events?.length?events.map(e=><div key={e.id} className="flex flex-wrap justify-between gap-4 rounded-xl bg-slate-50 p-4"><div><b>{e.title}</b><p className="mt-1 text-sm text-slate-500">{e.speaker_name} {e.speaker_company?"· "+e.speaker_company:""}</p></div>
 <div className="text-right text-sm text-slate-500">{new Date(e.starts_at).toLocaleString("en-IN",{timeZone:"Asia/Kolkata"})}<p className="mt-1 font-semibold">{e.status}</p></div></div>):<p className="text-sm text-slate-500">No global sessions created yet.</p>}</div></section>
 </main>;
}
