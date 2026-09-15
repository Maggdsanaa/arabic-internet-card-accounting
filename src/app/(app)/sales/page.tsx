"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import DeleteReasonModal from "@/components/DeleteReasonModal";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Sale {
  id: number;
  saleNumber: string;
  date: string;
  customerName: string;
  total: string;
  paidAmount: string;
  dueAmount: string;
  paymentMethod: string;
  isVoid: boolean;
}

interface Card {
  id: number;
  name: string;
  sellingPrice: string;
  quantity: number;
}

interface Customer {
  id: number;
  name: string;
  code: string;
}

interface SaleItem {
  cardId: number;
  quantity: number;
  unitPrice: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [cards, setCards] = useState<Card[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    customerId: "",
    customerName: "",
    paymentMethod: "cash",
    discount: 0,
    notes: "",
    items: [{ cardId: 0, quantity: 1, unitPrice: 0 }] as SaleItem[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [voidTarget, setVoidTarget] = useState<Sale | null>(null);
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");

  const load = async () => {
    setLoading(true);
    const [salesRes, cardsRes, customersRes] = await Promise.all([
      fetch("/api/sales"),
      fetch("/api/cards"),
      fetch("/api/customers"),
    ]);
    setSales(await salesRes.json());
    setCards(await cardsRes.json());
    setCustomers(await customersRes.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { cardId: 0, quantity: 1, unitPrice: 0 }] });
  };

  const removeItem = (idx: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });
  };

  const updateItem = (idx: number, field: keyof SaleItem, value: number) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: value };
    if (field === "cardId") {
      const card = cards.find((c) => c.id === value);
      if (card) items[idx].unitPrice = parseFloat(card.sellingPrice);
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
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          customerId: form.customerId ? parseInt(form.customerId) : undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowAddModal(false);
      setForm({ date: new Date().toISOString().split("T")[0], customerId: "", customerName: "", paymentMethod: "cash", discount: 0, notes: "", items: [{ cardId: 0, quantity: 1, unitPrice: 0 }] });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const paymentMethodLabel: Record<string, string> = {
    cash: "نقدي",
    credit: "آجل",
    bank: "بنك",
  };

  const handleVoid = async (reason: string) => {
    if (!voidTarget) return;
    setVoiding(true);
    setVoidError("");
    try {
      const res = await fetch(`/api/sales/${voidTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setVoidTarget(null);
      setNotice(data.message || "تم إرسال طلب الإلغاء للموافقة");
      setTimeout(() => setNotice(""), 6000);
      load();
    } catch (e) {
      setVoidError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setVoiding(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">المبيعات</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          + فاتورة مبيعات
        </button>
      </div>

      {notice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-sm">
          ℹ️ {notice}
        </div>
      )}

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">رقم الفاتورة</th>
                <th className="text-right py-3 px-4">التاريخ</th>
                <th className="text-right py-3 px-4">العميل</th>
                <th className="text-left py-3 px-4">الإجمالي</th>
                <th className="text-left py-3 px-4">المدفوع</th>
                <th className="text-left py-3 px-4">المتبقي</th>
                <th className="text-right py-3 px-4">طريقة الدفع</th>
                <th className="text-right py-3 px-4">الحالة</th>
                <th className="text-right py-3 px-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : sales.length === 0 ? (
                <tr><td colSpan={9} className="py-8 text-center text-gray-400">لا توجد مبيعات</td></tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className={`table-row ${sale.isVoid ? "opacity-50" : ""}`}>
                    <td className="py-3 px-4 text-blue-600 font-mono">{sale.saleNumber}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(sale.date)}</td>
                    <td className="py-3 px-4">{sale.customerName || "نقدي"}</td>
                    <td className="py-3 px-4 text-left font-bold">{formatCurrency(sale.total)}</td>
                    <td className="py-3 px-4 text-left text-green-600">{formatCurrency(sale.paidAmount)}</td>
                    <td className="py-3 px-4 text-left text-red-600">{formatCurrency(sale.dueAmount)}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${sale.paymentMethod === "cash" ? "bg-green-100 text-green-700" : sale.paymentMethod === "credit" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                        {paymentMethodLabel[sale.paymentMethod] || sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {sale.isVoid ? <span className="badge-danger">ملغى</span> : <span className="badge-success">نشط</span>}
                    </td>
                    <td className="py-3 px-4">
                      {!sale.isVoid && (
                        <button onClick={() => { setVoidTarget(sale); setVoidError(""); }} className="text-gray-400 hover:text-red-600">🗑️ إلغاء</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="فاتورة مبيعات جديدة" size="xl">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">العميل</label>
            <select value={form.customerId} onChange={(e) => {
              const customer = customers.find(c => c.id === parseInt(e.target.value));
              setForm({ ...form, customerId: e.target.value, customerName: customer?.name || "" });
            }} className="input-field">
              <option value="">-- نقدي بدون عميل --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">بنود الفاتورة</label>
              <button type="button" onClick={addItem} className="text-blue-600 text-sm hover:underline">+ إضافة بند</button>
            </div>
            <div className="space-y-2">
              {form.items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-lg">
                  <div className="col-span-5">
                    <select
                      value={item.cardId}
                      onChange={(e) => updateItem(idx, "cardId", parseInt(e.target.value))}
                      className="input-field text-sm"
                      required
                    >
                      <option value={0}>-- اختر الكارت --</option>
                      {cards.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (متاح: {c.quantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, "quantity", parseInt(e.target.value) || 1)}
                      className="input-field text-sm"
                      min="1"
                      placeholder="الكمية"
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                      className="input-field text-sm"
                      min="0"
                      step="0.01"
                      placeholder="السعر"
                    />
                  </div>
                  <div className="col-span-1 text-left font-medium text-sm">
                    {formatCurrency(item.quantity * item.unitPrice)}
                  </div>
                  <div className="col-span-1">
                    {form.items.length > 1 && (
                      <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">✕</button>
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
              <span className="text-sm text-gray-600">الإجمالي:</span>
              <span className="text-xl font-bold text-blue-700">{formatCurrency(total)} ريال</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} />
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "جاري الحفظ..." : "حفظ الفاتورة"}</button>
          </div>
        </form>
      </Modal>

      <DeleteReasonModal
        open={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        onConfirm={handleVoid}
        itemLabel={voidTarget?.saleNumber || ""}
        loading={voiding}
        error={voidError}
      />
    </div>
  );
}
