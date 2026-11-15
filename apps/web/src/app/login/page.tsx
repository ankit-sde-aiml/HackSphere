"use client";
import { useState } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/browser";
export default function Login(){
 const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
 async function signIn(){
  setBusy(true);setMessage("");
  try{const client=createClient();
   const {error}=await client.auth.signInWithOAuth({provider:"google",options:{redirectTo:window.location.origin+"/auth/callback?next=/workspace",queryParams:{prompt:"select_account"}}});
   if(error)throw error;
  }catch(e){setMessage(e instanceof Error?e.message:"Sign in is unavailable.");setBusy(false)}
 }
 return <main className="hs-container flex min-h-[65vh] items-center justify-center py-16">
 <div className="hs-card w-full max-w-md text-center"><span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600"><ShieldCheck size={30}/></span>
 <h1 className="mt-6 text-3xl font-black">Welcome to HackSphere</h1><p className="mt-3 text-sm leading-6 text-slate-600">Use your Google account to access training, mentor tools, or the Admin workspace.</p>
 <Button className="mt-8 w-full" onClick={signIn} disabled={busy}>{busy?"Connecting...":"Continue with Google"} <ArrowRight size={16}/></Button>
 {message&&<p role="alert" className="mt-4 text-sm text-rose-700">{message}</p>}
 <p className="mt-6 text-xs text-slate-500">Access is based on your verified enrollment or assigned platform role.</p></div></main>;
}
