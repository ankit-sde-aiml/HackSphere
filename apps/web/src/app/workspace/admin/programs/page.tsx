import { requireAdmin } from "@/lib/supabase/authorization";
import { ProgramCreateForm } from "@/components/admin/program-create-form";
export const dynamic="force-dynamic";
export default async function AdminPrograms(){
 const {db}=await requireAdmin();
 const {data:catalog}=await db.from("course_catalog").select("id,title").order("title");
 return <main className="hs-container py-12"><p className="hs-eyebrow">Admin / Program builder</p>
 <h1 className="mt-3 text-3xl font-black">Create a training + internship batch</h1>
 <p className="mt-3 max-w-2xl text-slate-600">Course, program and batch are separate. Set durations first; mentors and class schedule are allocated afterwards.</p>
 <div className="hs-card mt-8 max-w-3xl"><ProgramCreateForm courses={catalog||[]}/></div></main>;
}
