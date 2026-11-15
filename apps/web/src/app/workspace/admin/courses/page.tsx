import {requireAdmin} from "@/lib/supabase/authorization";
import {CourseCatalogForm} from "@/components/admin/course-catalog-form";
export const dynamic="force-dynamic";
export default async function CourseCatalog(){
 const {db}=await requireAdmin();
 const {data:courses}=await db.from("course_catalog").select("id,title,slug,description,is_published").order("title").limit(150);
 return <main className="hs-container py-12"><p className="hs-eyebrow">Admin / Course catalog</p>
  <h1 className="mt-3 text-3xl font-black">Reusable courses</h1>
  <p className="mt-3 max-w-2xl text-slate-600">A course defines the curriculum identity. Create separate batches for different start dates, pricing, mentors and schedules.</p>
  <section className="hs-card mt-8"><CourseCatalogForm/></section>
  <section className="hs-card mt-6"><h2 className="text-xl font-bold">Course templates</h2>
   <div className="mt-5 space-y-3">{courses?.length?courses.map(x=><div key={x.id} className="rounded-xl bg-slate-50 p-4"><b>{x.title}</b>
    <p className="mt-1 text-sm text-slate-500">{x.slug} · {x.is_published?"Published":"Draft"}</p>
   </div>):<p className="text-sm text-slate-500">No course templates yet. Existing program batches are preserved.</p>}</div></section>
 </main>;
}
