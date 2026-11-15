import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {EnrollForm} from "@/components/student/enroll-form";
export const dynamic="force-dynamic";
export default async function Enroll(){
 const db=await createClient();
 const {data:{user}}=await db.auth.getUser();
 if(!user)redirect("/login");
 const [programs,claims,enrollments,instructions]=await Promise.all([
  db.from("programs").select("id,title,fee_inr,training_days,internship_days,start_date").in("status",["published","ongoing"]).eq("is_test",false).order("start_date").limit(100),
  db.from("payment_claims").select("id,program_id,status").eq("student_id",user.id).order("created_at",{ascending:false}).limit(100),
  db.from("enrollments").select("program_id,status").eq("student_id",user.id).limit(100),
  db.rpc("get_payment_instructions")
 ]);
 return <main className="hs-container py-12"><span className="hs-eyebrow">Student enrollment</span>
 <h1 className="mt-3 text-3xl font-black">Choose a program and enroll</h1>
 <p className="mt-3 text-slate-600">Official UPI QR or UPI ID. Access activates only after an administrator verifies the actual bank credit.</p>
 <div className="hs-card mt-8"><EnrollForm
 programs={programs.data||[]} claims={claims.data||[]} enrollments={enrollments.data||[]}
 settings={instructions.data||{}} userId={user.id}/></div>
 </main>;
