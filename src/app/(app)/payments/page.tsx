"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Payment {
  id: number;
  paymentNumber: string;
  date: string;
  type: string;
  partyType: string;
  partyName: string;
  amount: string;
  paymentMethod: string;
}

interface Treasury {
  id: number;
  name: string;
  currentBalance: string;
}

interface Customer {
  id: number;
  name: string;
}
interface Supplier {
  id: number;
  name: string;
}
interface Partner {
  id: number;
  name: string;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [treasuries, setTreasuries] = useState<Treasury[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "receipt",
    partyType: "customer",
    partyId: "",
    partyName: "",
    amount: "",
    paymentMethod: "cash",
    notes: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const [pr, tr, cr, sr, par] = await Promise.all([
      fetch("/api/payments"),
      fetch("/api/treasury"),
      fetch("/api/customers"),
      fetch("/api/suppliers"),
      fetch("/api/partners"),
    ]);
    setPayments(await pr.json());
    setTreasuries(await tr.json());
    setCustomers(await cr.json());
    setSuppliers(await sr.json());
    setPartners(await par.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getPartyList = () => {
    if (form.partyType === "customer") return customers;
    if (form.partyType === "supplier") return suppliers;
    return partners;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          partyId: parseInt(form.partyId),
          amount: parseFloat(form.amount),
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowAddModal(false);
      setForm({ date: new Date().toISOString().split("T")[0], type: "receipt", partyType: "customer", partyId: "", partyName: "", amount: "", paymentMethod: "cash", notes: "" });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const typeLabel: Record<string, string> = { receipt: "تحصيل", payment: "دفعة" };
  const partyTypeLabel: Record<string, string> = { customer: "عميل", supplier: "مورد", partner: "شريك" };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">الخزينة والمدفوعات</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">+ قبض / دفع</button>
      </div>

      {/* Treasury Balances */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {treasuries.map((t) => (
          <div key={t.id} className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🏦</span>
              <div>
                <p className="text-sm text-green-700 font-medium">{t.name}</p>
                <p className="text-2xl font-bold text-green-800">{formatCurrency(t.currentBalance)} ريال</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Payments Table */}
      <div className="card overflow-hidden p-0">
        <div className="p-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">سجل المدفوعات والتحصيلات</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">الرقم</th>
                <th className="text-right py-3 px-4">التاريخ</th>
                <th className="text-right py-3 px-4">النوع</th>
                <th className="text-right py-3 px-4">الطرف</th>
                <th className="text-right py-3 px-4">نوع الطرف</th>
                <th className="text-left py-3 px-4">المبلغ</th>
                <th className="text-right py-3 px-4">طريقة الدفع</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : payments.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">لا توجد حركات</td></tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="py-3 px-4 text-blue-600 font-mono">{p.paymentNumber}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(p.date)}</td>
                    <td className="py-3 px-4">
                      <span className={`badge-${p.type === "receipt" ? "success" : "danger"}`}>
                        {typeLabel[p.type]}
                      </span>
                    </td>
                    <td className="py-3 px-4">{p.partyName}</td>
                    <td className="py-3 px-4 text-gray-500">{partyTypeLabel[p.partyType]}</td>
                    <td className="py-3 px-4 text-left font-bold">{formatCurrency(p.amount)}</td>
                    <td className="py-3 px-4">
                      <span className="badge-info">{p.paymentMethod === "cash" ? "نقدي" : "بنك"}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="إضافة قبض / دفع">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                <option value="receipt">تحصيل (قبض)</option>
                <option value="payment">دفعة (صرف)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">نوع الطرف</label>
              <select value={form.partyType} onChange={(e) => setForm({ ...form, partyType: e.target.value, partyId: "", partyName: "" })} className="input-field">
                <option value="customer">عميل</option>
                <option value="supplier">مورد</option>
                <option value="partner">شريك</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الطرف</label>
              <select value={form.partyId} onChange={(e) => {
                const party = getPartyList().find(p => p.id === parseInt(e.target.value));
                setForm({ ...form, partyId: e.target.value, partyName: party?.name || "" });
              }} className="input-field" required>
                <option value="">-- اختر --</option>
                {getPartyList().map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ *</label>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="input-field" min="0.01" step="0.01" required />
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
