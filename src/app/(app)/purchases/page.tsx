"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Purchase {
  id: number;
  purchaseNumber: string;
  date: string;
  supplierName: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  paymentMethod: string;
}

interface Card {
  id: number;
  name: string;
  purchasePrice: string;
}

interface Supplier {
  id: number;
  name: string;
}

interface PurchaseItem {
  cardId: number;
  quantity: number;
  unitPrice: number;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    supplierId: "",
    supplierName: "",
    paymentMethod: "cash",
    discount: 0,
    notes: "",
    items: [{ cardId: 0, quantity: 1, unitPrice: 0 }] as PurchaseItem[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const [pr, cr, sr] = await Promise.all([
      fetch("/api/purchases"),
      fetch("/api/cards"),
      fetch("/api/suppliers"),
    ]);
    setPurchases(await pr.json());
    setCards(await cr.json());
    setSuppliers(await sr.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addItem = () => setForm({ ...form, items: [...form.items, { cardId: 0, quantity: 1, unitPrice: 0 }] });
  const removeItem = (idx: number) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const updateItem = (idx: number, field: keyof PurchaseItem, value: number) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "cardId") {
      const card = cards.find((c) => c.id === value);
      if (card) items[idx].unitPrice = parseFloat(card.purchasePrice);
    }
    setForm({ ...form, items });
  };

  const subtotal = form.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const total = subtotal - form.discount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          supplierId: form.supplierId ? parseInt(form.supplierId) : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowAddModal(false);
      setForm({ date: new Date().toISOString().split("T")[0], supplierId: "", supplierName: "", paymentMethod: "cash", discount: 0, notes: "", items: [{ cardId: 0, quantity: 1, unitPrice: 0 }] });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">المشتريات</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">+ فاتورة مشتريات</button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">رقم الفاتورة</th>
                <th className="text-right py-3 px-4">التاريخ</th>
                <th className="text-right py-3 px-4">المورد</th>
                <th className="text-left py-3 px-4">الإجمالي</th>
                <th className="text-left py-3 px-4">المدفوع</th>
                <th className="text-left py-3 px-4">المتبقي</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">لا توجد مشتريات</td></tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="py-3 px-4 text-blue-600 font-mono">{p.purchaseNumber}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(p.date)}</td>
                    <td className="py-3 px-4">{p.supplierName || "—"}</td>
                    <td className="py-3 px-4 text-left font-bold">{formatCurrency(p.total)}</td>
                    <td className="py-3 px-4 text-left text-green-600">{formatCurrency(p.paidAmount)}</td>
                    <td className="py-3 px-4 text-left text-red-600">{formatCurrency(p.dueAmount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="فاتورة مشتريات جديدة" size="xl">
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
                <option value="credit">آجل</option>
                <option value="bank">بنك</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المورد</label>
            <select value={form.supplierId} onChange={(e) => {
              const s = suppliers.find(s => s.id === parseInt(e.target.value));
              setForm({ ...form, supplierId: e.target.value, supplierName: s?.name || "" });
            }} className="input-field">
              <option value="">-- بدون مورد --</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">بنود الفاتورة</label>
              <button type="button" onClick={addItem} className="text-blue-600 text-sm hover:underline">+ إضافة بند</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                  <div className="col-span-5">
                    <select value={item.cardId} onChange={(e) => updateItem(idx, "cardId", parseInt(e.target.value))} className="input-field text-sm" required>
                      <option value={0}>-- اختر الكارت --</option>
                      {cards.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)} className="input-field text-sm" min="1" />
                  </div>
                  <div className="col-span-3">
                    <input type="number" value={item.unitPrice} onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)} className="input-field text-sm" min="0" step="0.01" />
                  </div>
                  <div className="col-span-1 text-sm font-medium">{formatCurrency(item.quantity * item.unitPrice)}</div>
                  <div className="col-span-1">
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-500">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الخصم</label>
              <input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: parseFloat(e.target.value) || 0 })} className="input-field" min="0" />
            </div>
            <div className="bg-blue-50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm">الإجمالي:</span>
              <span className="text-xl font-bold text-blue-700">{formatCurrency(total)} ريال</span>
            </div>
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
