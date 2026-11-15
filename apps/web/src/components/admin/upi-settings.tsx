"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
type Settings={upi_id?:string;payee?:string;qr_url?:string;instructions?:string};
export function UpiSettings({settings}:{settings:Settings}){
 const router=useRouter(),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 const input="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm";
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setBusy(true);setMessage("");
  const fd=new FormData(e.currentTarget),val=(k:string)=>String(fd.get(k)||"").trim();
  try{
   if(!val("upi_id")||!val("payee"))throw Error("Official payee and UPI ID required.");
   if(val("qr_url")&&!val("qr_url").startsWith("https://"))throw Error("QR image must use HTTPS.");
   const db=createClient(),{data:{user}}=await db.auth.getUser();
   if(!user)throw Error("Admin sign-in required");
   const {error}=await db.from("site_settings").upsert({
    key:"payments_upi",value:{upi_id:val("upi_id"),payee:val("payee"),qr_url:val("qr_url"),instructions:val("instructions")},
    updated_by:user.id
   },{onConflict:"key"});
   if(error)throw error;
   setMessage("UPI settings updated. Test QR recipient before starting enrollments.");
   router.refresh();
  }catch(e){setMessage(e instanceof Error?e.message:"Could not save settings");}
  finally{setBusy(false)}
 }
 return <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
  <label className="text-sm font-semibold">Official UPI ID<input name="upi_id" className={input} defaultValue={settings.upi_id||""} required/></label>
  <label className="text-sm font-semibold">Official payee / receiver<input name="payee" className={input} defaultValue={settings.payee||""} required/></label>
  <label className="sm:col-span-2 text-sm font-semibold">Hosted QR image URL<input type="url" name="qr_url" className={input} defaultValue={settings.qr_url||""}/></label>
  <label className="sm:col-span-2 text-sm font-semibold">Student instructions<textarea name="instructions" className={input+" min-h-24"} defaultValue={settings.instructions||""}/></label>
  <div className="sm:col-span-2"><Button disabled={busy}>{busy?"Saving...":"Save official UPI details"}</Button>
   <p role="status" className="mt-3 text-sm text-slate-600">{message}</p></div>
 </form>;
}
