"use client";
import {useState} from "react";
import {createClient} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
type Session={id:string;title:string;session_date:string;start_time:string;duration_minutes:number;meet_status:string;status:string};
export function LiveClassList({sessions}:{sessions:Session[]}){
 const [busy,setBusy]=useState(""),[message,setMessage]=useState("");
 async function join(id:string){
  const popup=window.open("","_blank");setBusy(id);setMessage("");
  try{
   const {data,error}=await createClient().rpc("get_my_session_join_uri",{_session_id:id});
   if(error)throw error;if(!data)throw Error("The Meet link is not ready");
   if(popup){popup.opener=null;popup.location.replace(data);}
   else setMessage("Allow popups to join this class.");
  }catch(err){popup?.close();setMessage(err instanceof Error?err.message:"Joining unavailable");}
  finally{setBusy("")}
 }
 return <div><h2 className="text-xl font-bold">Scheduled classes</h2>
  <div className="mt-6 space-y-3">{sessions.map(s=><article key={s.id} className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
   <div><h3 className="font-bold">{s.title}</h3><p className="mt-1 text-sm text-slate-600">{s.session_date} · {String(s.start_time).slice(0,5)} · {s.duration_minutes} minutes</p>
    <p className="mt-1 text-xs text-slate-500">{s.meet_status==="ready"?"Google Meet connected":"Admin has not connected the meeting yet"}</p></div>
   {s.meet_status==="ready"?<Button disabled={busy===s.id} size="sm" onClick={()=>join(s.id)}>Join Google Meet</Button>:
    <span className="text-sm font-semibold text-amber-700">Meeting pending</span>}
  </article>)}
  {!sessions.length&&<p className="text-sm text-slate-500">No classes scheduled for your programs.</p>}
  </div><p role="status" className="mt-4 text-sm text-slate-600">{message}</p>
 </div>;
}}
