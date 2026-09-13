import { ManagedTable } from "@/components/managed-table";
import { ErrorPanel } from "@/components/error-panel";
import { getUsers } from "@/lib/dashboard/data";
import { formatDate } from "@/lib/dashboard/format";
import { requireAdmin } from "@/lib/auth/session";

export default async function UsersPage() { await requireAdmin("users:read"); try { const source=await getUsers(); const rows=source.map((row)=>({id:String(row.id),full_name:String(row.full_name||"—"),email:String(row.email||"—"),company:String(row.company||"—"),occupation:String(row.occupation||"—"),city:String(row.city||"—"),country_code:String(row.country_code||"—"),created_at:formatDate(row.created_at)})); return <><header className="page-header"><div><p className="eyebrow">Customers</p><h1>Registered users</h1><p>Profiles synchronized from Supabase Auth.</p></div></header><ManagedTable rows={rows} columns={[{key:"full_name",label:"Name"},{key:"email",label:"Email"},{key:"company",label:"Company"},{key:"occupation",label:"Occupation"},{key:"city",label:"City"},{key:"country_code",label:"Country"},{key:"created_at",label:"Joined"}]} /></>; } catch(error){return <ErrorPanel error={error}/>;} }
