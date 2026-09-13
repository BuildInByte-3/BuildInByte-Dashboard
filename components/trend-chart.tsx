"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Row } from "@/lib/dashboard/data";

export function TrendChart({ data }: { data: Row[] }) {
  if (!data.length) return <div className="empty-state">No trend data is available for this period.</div>;
  return <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="bucket" /><YAxis /><Tooltip /><Bar dataKey="net_sales_inr_minor" name="Net sales (paise)" fill="#111110" radius={[4,4,0,0]} /><Bar dataKey="profit_inr_minor" name="Profit (paise)" fill="#6d6a63" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>;
}
