"use client";
import {useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import {createClient} from "@/lib/supabase/browser";
import {Button} from "@/components/ui/button";
export function CourseCatalogForm(){
 const router=useRouter(),[saving,setSaving]=useState(false),[message,setMessage]=useState("");
 const input="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm";
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setSaving(true);setMessage("");
  const fd=new FormData(e.currentTarget),title=String(fd.get("title")||"").trim();
  const slug=String(fd.get("slug")||"").trim().toLowerCase();
  try{
   if(title.length<3||!/^[a-z0-9-]+$/.test(slug))throw Error("Enter a valid title and lowercase hyphen-separated slug.");
   const {error}=await createClient().from("course_catalog").insert({
    title,slug,description:String(fd.get("description")||""),is_published:false
   });
   if(error)throw error;setMessage("Course template saved. Create a program batch to enroll students.");router.refresh();
  }catch(err){setMessage(err instanceof Error?err.message:"Could not create course");}
  finally{setSaving(false)}
 }
 return <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
  <label className="text-sm font-semibold">Course title<input name="title" required minLength={3} className={input} placeholder="Full Stack Development"/></label>
  <label className="text-sm font-semibold">Unique slug<input name="slug" required pattern="[a-z0-9-]+" className={input} placeholder="full-stack-development"/></label>
  <label className="sm:col-span-2 text-sm font-semibold">Description<textarea name="description" className={input+" min-h-24"}/></label>
  <div className="sm:col-span-2"><Button disabled={saving}>{saving?"Saving...":"Create course template"}</Button><p role="status" className="mt-3 text-sm text-slate-600">{message}</p></div>
 </form>;
