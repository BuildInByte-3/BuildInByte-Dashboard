import { DataTable } from "@/components/data-table";
import { ErrorPanel } from "@/components/error-panel";
import { getGeography,type Row } from "@/lib/dashboard/data";
import { requireAdmin } from "@/lib/auth/session";

function aggregate(rows:Row[]){const map=new Map<string,number>();for(const row of rows){const key=[row.city,row.region,row.country_code].filter(Boolean).join(", ")||"Unknown";map.set(key,(map.get(key)||0)+Number(row.visitors||1));}return [...map.entries()].map(([location,count])=>({location,count})).sort((a,b)=>b.count-a.count);}
export default async function GeographyPage(){await requireAdmin("dashboard:read");try{const {customers,visitors}=await getGeography();return <><header className="page-header"><div><p className="eyebrow">Locations</p><h1>Geography</h1><p>Explicit customer locations and anonymous visitor geography are kept separate.</p></div></header><div className="geo-grid"><section className="panel"><div className="panel-title"><h2>Customers</h2></div><DataTable rows={aggregate(customers)} columns={[{key:"location",label:"Location"},{key:"count",label:"Customers"}]} /></section><section className="panel"><div className="panel-title"><h2>Consented visitors</h2></div><DataTable rows={aggregate(visitors)} columns={[{key:"location",label:"Slots"},{key:"count",label:"Visitors"}]} /></section></div></>;}catch(error){return <ErrorPanel error={error}/>;}}
