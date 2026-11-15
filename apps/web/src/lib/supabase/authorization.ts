import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export async function requireAdmin(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const {data:roles,error}=await db.from("staff_roles").select("role").eq("user_id",user.id);
 if(error||!roles?.some(x=>x.role==="admin"))redirect("/workspace");
 return {db,user};
}
export async function requireMentor(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const [{data:roles},{data:members}]=await Promise.all([
  db.from("staff_roles").select("role").eq("user_id",user.id),
  db.from("program_mentors").select("program_id").eq("mentor_id",user.id).limit(1)
 ]);
 if(!members?.length&&!roles?.some(x=>["admin","mentor","trainer","guide"].includes(x.role)))
 redirect("/workspace");
 return {db,user};
}

