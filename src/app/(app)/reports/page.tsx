"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";

interface ProfitLossData {
  revenueAccounts: Array<{ id: number; name: string; code: string; balance: number }>;
  expenseAccounts: Array<{ id: number; name: string; code: string; balance: number }>;
  totalRevenue: number;
  totalExpense: number;
  netProfit: number;
}

export default function ReportsPage() {
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/reports/profit-loss?${params}`);
    setData(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">الأرباح والخسائر</h1>
        <button onClick={() => window.print()} className="btn-secondary">🖨️ طباعة</button>
      </div>

      {/* Date Filter */}
      <div className="card">
        <div className="flex gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">من تاريخ</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">إلى تاريخ</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="input-field" />
          </div>
          <button onClick={load} className="btn-primary">تطبيق</button>
          <button onClick={() => { setFrom(""); setTo(""); setTimeout(load, 100); }} className="btn-secondary">إعادة تعيين</button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">جاري التحميل...</div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card bg-green-50 border-green-200">
              <p className="text-sm text-green-600 mb-1">إجمالي الإيرادات</p>
              <p className="text-2xl font-bold text-green-800">{formatCurrency(data?.totalRevenue)} ريال</p>
            </div>
            <div className="card bg-red-50 border-red-200">
              <p className="text-sm text-red-600 mb-1">إجمالي المصروفات</p>
              <p className="text-2xl font-bold text-red-800">{formatCurrency(data?.totalExpense)} ريال</p>
            </div>
            <div className={`card border-2 ${(data?.netProfit || 0) >= 0 ? "bg-blue-50 border-blue-300" : "bg-red-50 border-red-300"}`}>
              <p className={`text-sm mb-1 ${(data?.netProfit || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                {(data?.netProfit || 0) >= 0 ? "صافي الربح" : "صافي الخسارة"}
              </p>
              <p className={`text-2xl font-bold ${(data?.netProfit || 0) >= 0 ? "text-blue-800" : "text-red-800"}`}>
                {formatCurrency(Math.abs(data?.netProfit || 0))} ريال
              </p>
            </div>
          </div>

          {/* Profit Margin */}
          {(data?.totalRevenue || 0) > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">هامش الربح</span>
                <span className="font-bold text-lg">
                  {(((data?.netProfit || 0) / (data?.totalRevenue || 1)) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full ${(data?.netProfit || 0) >= 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(100, Math.abs(((data?.netProfit || 0) / (data?.totalRevenue || 1)) * 100))}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">
            {/* Revenue */}
            <div className="card">
              <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full inline-block"></span>
                الإيرادات
              </h2>
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="text-right py-2 px-3">الحساب</th>
                    <th className="text-left py-2 px-3">المبلغ</th>
                    <th className="text-left py-2 px-3">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.revenueAccounts.filter(a => a.balance > 0).map((account) => (
                    <tr key={account.id} className="table-row">
                      <td className="py-2 px-3">{account.name}</td>
                      <td className="py-2 px-3 text-left text-green-600 font-medium">{formatCurrency(account.balance)}</td>
                      <td className="py-2 px-3 text-left text-gray-400 text-xs">
                        {(data?.totalRevenue || 0) > 0 ? ((account.balance / data!.totalRevenue) * 100).toFixed(1) + "%" : "0%"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-green-50 font-bold">
                    <td className="py-2 px-3">الإجمالي</td>
                    <td className="py-2 px-3 text-left text-green-700">{formatCurrency(data?.totalRevenue)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Expenses */}
            <div className="card">
              <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full inline-block"></span>
                المصروفات
              </h2>
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="text-right py-2 px-3">الحساب</th>
                    <th className="text-left py-2 px-3">المبلغ</th>
                    <th className="text-left py-2 px-3">النسبة</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.expenseAccounts.filter(a => a.balance > 0).map((account) => (
                    <tr key={account.id} className="table-row">
                      <td className="py-2 px-3">{account.name}</td>
                      <td className="py-2 px-3 text-left text-red-600 font-medium">{formatCurrency(account.balance)}</td>
                      <td className="py-2 px-3 text-left text-gray-400 text-xs">
                        {(data?.totalExpense || 0) > 0 ? ((account.balance / data!.totalExpense) * 100).toFixed(1) + "%" : "0%"}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-red-50 font-bold">
                    <td className="py-2 px-3">الإجمالي</td>
                    <td className="py-2 px-3 text-left text-red-700">{formatCurrency(data?.totalExpense)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
