"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatCurrency } from "@/lib/utils";

interface Account {
  id: number;
  code: string;
  nameAr: string;
  type: string;
  isSystem: boolean;
  balance?: number;
  totalDebit?: number;
  totalCredit?: number;
}

const typeLabels: Record<string, string> = {
  asset: "أصل",
  liability: "التزام",
  equity: "حقوق ملكية",
  revenue: "إيراد",
  expense: "مصروف",
};

const typeColors: Record<string, string> = {
  asset: "bg-blue-100 text-blue-700",
  liability: "bg-red-100 text-red-700",
  equity: "bg-purple-100 text-purple-700",
  revenue: "bg-green-100 text-green-700",
  expense: "bg-orange-100 text-orange-700",
};

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState("");
  const [form, setForm] = useState({
    code: "",
    nameAr: "",
    type: "asset",
    description: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/accounts?withBalance=true");
    setAccounts(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filterType ? accounts.filter((a) => a.type === filterType) : accounts;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowAddModal(false);
      setForm({ code: "", nameAr: "", type: "asset", description: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  // Group by type
  const groups = ["asset", "liability", "equity", "revenue", "expense"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">دليل الحسابات</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">+ إضافة حساب</button>
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterType("")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!filterType ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          >
            الكل ({accounts.length})
          </button>
          {groups.map((type) => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterType === type ? "bg-blue-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {typeLabels[type]} ({accounts.filter(a => a.type === type).length})
            </button>
          ))}
        </div>
      </div>

      {/* Accounts Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">الكود</th>
                <th className="text-right py-3 px-4">اسم الحساب</th>
                <th className="text-right py-3 px-4">النوع</th>
                <th className="text-left py-3 px-4">إجمالي المدين</th>
                <th className="text-left py-3 px-4">إجمالي الدائن</th>
                <th className="text-left py-3 px-4">الرصيد</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">لا توجد حسابات</td></tr>
              ) : (
                filtered.map((account) => (
                  <tr key={account.id} className="table-row">
                    <td className="py-3 px-4 font-mono text-blue-600">{account.code}</td>
                    <td className="py-3 px-4 font-medium text-gray-800">
                      {account.nameAr}
                      {account.isSystem && <span className="mr-2 text-xs text-gray-400">(نظام)</span>}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${typeColors[account.type]}`}>
                        {typeLabels[account.type]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-left text-red-600">{formatCurrency(account.totalDebit)}</td>
                    <td className="py-3 px-4 text-left text-green-600">{formatCurrency(account.totalCredit)}</td>
                    <td className="py-3 px-4 text-left font-bold">
                      <span className={account.balance && account.balance > 0 ? "text-blue-700" : "text-gray-500"}>
                        {formatCurrency(account.balance)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="إضافة حساب جديد">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">كود الحساب *</label>
              <input type="text" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="input-field" required placeholder="مثال: 1150" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                {groups.map((t) => <option key={t} value={t}>{typeLabels[t]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الحساب (عربي) *</label>
            <input type="text" value={form.nameAr} onChange={(e) => setForm({ ...form, nameAr: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" rows={2} />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "جاري الحفظ..." : "حفظ"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
