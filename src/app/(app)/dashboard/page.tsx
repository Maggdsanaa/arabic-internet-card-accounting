"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface DashboardData {
  monthlySales: number;
  monthlyPurchases: number;
  monthlyExpenses: number;
  customerCount: number;
  supplierCount: number;
  lowStockCards: Array<{ id: number; name: string; quantity: number; minQuantity: number }>;
  treasuryBalances: Array<{ id: number; name: string; currentBalance: string }>;
  pendingApprovals: number;
  recentEntries: Array<{ id: number; entryNumber: string; description: string; totalDebit: string; date: string }>;
  totalReceivables: number;
  totalPayables: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-center">
          <div className="text-4xl mb-3 animate-pulse">📊</div>
          <p>جاري تحميل البيانات...</p>
        </div>
      </div>
    );
  }

  const netProfit = (data?.monthlySales || 0) - (data?.monthlyPurchases || 0) - (data?.monthlyExpenses || 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">لوحة التحكم</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="مبيعات الشهر"
          value={formatCurrency(data?.monthlySales)}
          icon="🛒"
          color="blue"
          sub="ريال"
        />
        <StatCard
          title="مشتريات الشهر"
          value={formatCurrency(data?.monthlyPurchases)}
          icon="📦"
          color="purple"
          sub="ريال"
        />
        <StatCard
          title="مصروفات الشهر"
          value={formatCurrency(data?.monthlyExpenses)}
          icon="💸"
          color="red"
          sub="ريال"
        />
        <StatCard
          title="صافي الربح"
          value={formatCurrency(netProfit)}
          icon="📈"
          color={netProfit >= 0 ? "green" : "red"}
          sub="ريال"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="العملاء"
          value={String(data?.customerCount || 0)}
          icon="👥"
          color="teal"
          sub="عميل نشط"
        />
        <StatCard
          title="الموردون"
          value={String(data?.supplierCount || 0)}
          icon="🏭"
          color="orange"
          sub="مورد نشط"
        />
        <StatCard
          title="الذمم المدينة"
          value={formatCurrency(data?.totalReceivables)}
          icon="📤"
          color="amber"
          sub="ريال"
        />
        <StatCard
          title="الذمم الدائنة"
          value={formatCurrency(data?.totalPayables)}
          icon="📥"
          color="rose"
          sub="ريال"
        />
      </div>

      {/* Treasury & Alerts Row */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Treasury */}
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            🏦 أرصدة الخزينة
          </h2>
          <div className="space-y-3">
            {data?.treasuryBalances.map((t) => (
              <div key={t.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                <span className="text-sm text-gray-600">{t.name}</span>
                <span className="font-bold text-green-700">
                  {formatCurrency(t.currentBalance)} ريال
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock */}
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            ⚠️ مخزون منخفض
            {(data?.lowStockCards.length || 0) > 0 && (
              <span className="badge-danger">
                {data?.lowStockCards.length}
              </span>
            )}
          </h2>
          {data?.lowStockCards.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              ✅ المخزون بمستوى جيد
            </p>
          ) : (
            <div className="space-y-2">
              {data?.lowStockCards.map((card) => (
                <div key={card.id} className="flex justify-between items-center p-2 bg-red-50 rounded-lg">
                  <span className="text-sm text-gray-700">{card.name}</span>
                  <div className="text-left">
                    <span className="text-red-600 font-bold text-sm">
                      {card.quantity}
                    </span>
                    <span className="text-gray-400 text-xs"> / {card.minQuantity}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="card">
          <h2 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
            ✅ طلبات الموافقة
          </h2>
          <div className="text-center py-4">
            <div className="text-5xl font-bold text-amber-500 mb-2">
              {data?.pendingApprovals || 0}
            </div>
            <p className="text-sm text-gray-500">طلب معلق</p>
            {(data?.pendingApprovals || 0) > 0 && (
              <Link
                href="/approvals"
                className="mt-3 inline-block btn-primary text-sm"
              >
                مراجعة الطلبات
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Recent Entries */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700">آخر القيود المحاسبية</h2>
          <Link href="/journal" className="text-blue-600 text-sm hover:underline">
            عرض الكل
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-right py-2 px-3">رقم القيد</th>
                <th className="text-right py-2 px-3">التاريخ</th>
                <th className="text-right py-2 px-3">البيان</th>
                <th className="text-left py-2 px-3">المبلغ</th>
              </tr>
            </thead>
            <tbody>
              {data?.recentEntries.map((entry) => (
                <tr key={entry.id} className="table-row">
                  <td className="py-2 px-3 font-mono text-blue-600">
                    {entry.entryNumber}
                  </td>
                  <td className="py-2 px-3 text-gray-500">
                    {formatDate(entry.date)}
                  </td>
                  <td className="py-2 px-3 text-gray-700">{entry.description}</td>
                  <td className="py-2 px-3 text-left font-medium">
                    {formatCurrency(entry.totalDebit)}
                  </td>
                </tr>
              ))}
              {(!data?.recentEntries || data.recentEntries.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-gray-400">
                    لا توجد قيود بعد
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  sub,
}: {
  title: string;
  value: string;
  icon: string;
  color: string;
  sub: string;
}) {
  const colors: Record<string, string> = {
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    red: "from-red-500 to-red-600",
    green: "from-green-500 to-green-600",
    teal: "from-teal-500 to-teal-600",
    orange: "from-orange-500 to-orange-600",
    amber: "from-amber-500 to-amber-600",
    rose: "from-rose-500 to-rose-600",
  };

  return (
    <div
      className={`bg-gradient-to-br ${colors[color] || colors.blue} rounded-xl p-4 text-white shadow-sm`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs opacity-80">{sub}</span>
      </div>
      <div className="text-2xl font-bold mb-1">{value}</div>
      <div className="text-sm opacity-80">{title}</div>
    </div>
  );
}
