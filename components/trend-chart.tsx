"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Row } from "@/lib/dashboard/data";

export function TrendChart({ data }: { data: Row[] }) {
  if (!data.length) return <div className="empty-state">No trend data is available for this period.</div>;
  const compactCurrency = (value: number) => new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value / 100);
  return <div className="chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={data} barGap={3}><CartesianGrid stroke="#ecebe7" vertical={false} /><XAxis axisLine={false} dataKey="bucket" fontSize={11} tickLine={false} tickMargin={10} /><YAxis axisLine={false} fontSize={11} tickFormatter={compactCurrency} tickLine={false} width={48} /><Tooltip cursor={{ fill: "#f3f2ef" }} formatter={(value) => [`₹${compactCurrency(Number(value))}`, ""]} /><Legend iconSize={8} wrapperStyle={{ fontSize:12, paddingTop:12 }} /><Bar dataKey="net_sales_inr_minor" name="Net sales" fill="#171715" radius={[3,3,0,0]} /><Bar dataKey="profit_inr_minor" name="Profit" fill="#b9b7b0" radius={[3,3,0,0]} /></BarChart></ResponsiveContainer></div>;
}
