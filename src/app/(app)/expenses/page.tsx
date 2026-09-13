"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Expense {
  id: number;
  expenseNumber: string;
  date: string;
  description: string;
  amount: string;
  paymentMethod: string;
  accountName: string;
}

interface Account {
  id: number;
  code: string;
  nameAr: string;
  type: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    categoryAccountId: "",
    description: "",
    amount: "",
    paymentMethod: "cash",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const [er, ar] = await Promise.all([
      fetch("/api/expenses"),
      fetch("/api/accounts"),
    ]);
    setExpenses(await er.json());
    const allAccounts: Account[] = await ar.json();
    setAccounts(allAccounts.filter((a) => a.type === "expense"));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          categoryAccountId: parseInt(form.categoryAccountId),
          amount: parseFloat(form.amount),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowAddModal(false);
      setForm({ date: new Date().toISOString().split("T")[0], categoryAccountId: "", description: "", amount: "", paymentMethod: "cash", notes: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">المصروفات</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">+ إضافة مصروف</button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="card col-span-3 md:col-span-1 bg-red-50 border-red-100">
          <p className="text-sm text-red-600 mb-1">إجمالي المصروفات</p>
          <p className="text-2xl font-bold text-red-700">{formatCurrency(totalExpenses)} ريال</p>
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">الرقم</th>
                <th className="text-right py-3 px-4">التاريخ</th>
                <th className="text-right py-3 px-4">البيان</th>
                <th className="text-right py-3 px-4">التصنيف</th>
                <th className="text-left py-3 px-4">المبلغ</th>
                <th className="text-right py-3 px-4">طريقة الدفع</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : expenses.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">لا توجد مصروفات</td></tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="table-row">
                    <td className="py-3 px-4 text-blue-600 font-mono">{e.expenseNumber}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(e.date)}</td>
                    <td className="py-3 px-4">{e.description}</td>
                    <td className="py-3 px-4 text-gray-500">{e.accountName}</td>
                    <td className="py-3 px-4 text-left font-bold text-red-600">{formatCurrency(e.amount)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge-${e.paymentMethod === "cash" ? "success" : "info"}`}>
                        {e.paymentMethod === "cash" ? "نقدي" : "بنك"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="إضافة مصروف">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
              <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="input-field">
                <option value="cash">نقدي</option>
                <option value="bank">بنك</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف *</label>
            <select value={form.categoryAccountId} onChange={(e) => setForm({ ...form, categoryAccountId: e.target.value })} className="input-field" required>
              <option value="">-- اختر التصنيف --</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.nameAr} ({a.code})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البيان *</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
            <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" min="0.01" step="0.01" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} />
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
