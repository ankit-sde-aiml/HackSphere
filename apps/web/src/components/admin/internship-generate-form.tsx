"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
type Program={id:string;title:string;training_days:number;start_date:string;is_test:boolean;status:string};
export function InternshipGenerateForm({programs}:{programs:Program[]}){
 const [message,setMessage]=useState("");const [saving,setSaving]=useState(false);const router=useRouter();
 async function generate(e:FormEvent<HTMLFormElement>){
  e.preventDefault();const id=String(new FormData(e.currentTarget).get("program_id")||"");
  if(!window.confirm("Allocate five-member teams for this program? This uses active, non-test enrollments and eligible mentor capacity."))return;
  setSaving(true);setMessage("");
  try{const {data,error}=await createClient().rpc("generate_internship_teams",{_program_id:id});
   if(error)throw error;
   setMessage("Allocation complete: "+JSON.stringify(data));router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:"Allocation could not be completed");}
  finally{setSaving(false)}
 }
 return <form className="space-y-4" onSubmit={generate}>
  <label className="block text-sm font-semibold">Choose program<select name="program_id" required className="mt-2 w-full rounded-xl border border-slate-200 p-3">
  {programs.filter(p=>!p.is_test).map(p=><option key={p.id} value={p.id}>{p.title} · training {p.training_days} days</option>)}</select></label>
  <Button disabled={saving||!programs.some(p=>!p.is_test)}>{saving?"Generating...":"Generate internship teams"}</Button>
  <p role="status" className="text-sm text-slate-600">{message}</p>
 </form>;
}
