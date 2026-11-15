"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
type Session={id:string;title:string;session_date:string;start_time:string;meet_status:string;status:string;program_id:string};
export function MeetLinkForm({sessions}:{sessions:Session[]}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  const fd=new FormData(e.currentTarget),id=String(fd.get("session_id")||""),
   url=String(fd.get("meet_uri")||"").trim();
  try{
   if(!/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(url))
    throw Error("Enter an ordinary Google Meet URL such as https://meet.google.com/abc-defg-hij");
   const {error}=await createClient().rpc("register_meet_space",{
    _session_id:id,_meet_uri:url,_space_name:null
   });if(error)throw error;
   setMessage("Google Meet linked to class. Authorized students can join near scheduled time.");router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:"Could not save Meet link");}
  finally{setBusy(false)}
 }
 return <div><form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
  <label className="text-sm font-semibold">Scheduled class<select name="session_id" required className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm">
   {sessions.map(s=><option key={s.id} value={s.id}>{s.session_date} — {s.title} ({s.meet_status})</option>)}
  </select></label>
  <label className="text-sm font-semibold">Google Meet URL<input name="meet_uri" type="url" required
   placeholder="https://meet.google.com/abc-defg-hij" className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm"/></label>
  <div className="sm:col-span-2"><Button disabled={busy||!sessions.length}>{busy?"Saving...":"Attach Google Meet link"}</Button>
   <p role="status" className="mt-3 text-sm text-slate-600">{message}</p></div>
 </form>
 <section className="mt-8 border-t border-slate-100 pt-6">
  <h2 className="text-lg font-bold">Upcoming class link statuses</h2>
  <div className="mt-4 space-y-3">{sessions.map(s=><div key={s.id} className="flex justify-between gap-3 rounded-xl bg-slate-50 p-3 text-sm">
   <div><b>{s.title}</b><p className="mt-1 text-xs text-slate-500">{s.session_date} · {String(s.start_time).slice(0,5)} IST</p></div>
   <span className={s.meet_status==="ready"?"text-emerald-700":"text-amber-700"}>{s.meet_status}</span>
  </div>)}</div>
 </section></div>;
}}
