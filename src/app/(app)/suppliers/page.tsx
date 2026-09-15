"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import DeleteReasonModal from "@/components/DeleteReasonModal";
import { formatDate } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils";

interface Supplier {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  notes?: string;
  createdAt: string;
}

interface Statement {
  date: string;
  description: string;
  entryDescription: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [statement, setStatement] = useState<Statement[]>([]);
  const [statBalance, setStatBalance] = useState(0);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "", reason: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/suppliers");
    setSuppliers(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditSupplier(null);
    setForm({ name: "", phone: "", email: "", address: "", notes: "", reason: "" });
    setShowAddModal(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditSupplier(supplier);
    setForm({
      name: supplier.name,
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
      reason: "",
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editSupplier ? `/api/suppliers/${editSupplier.id}` : "/api/suppliers";
      const method = editSupplier ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAddModal(false);
      setEditSupplier(null);
      setForm({ name: "", phone: "", email: "", address: "", notes: "", reason: "" });
      if (res.status === 202) {
        setNotice(data.message || "تم إرسال الطلب للموافقة");
        setTimeout(() => setNotice(""), 6000);
      }
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (reason: string) => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/suppliers/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteTarget(null);
      setNotice(data.message || "تم إرسال طلب الحذف للموافقة");
      setTimeout(() => setNotice(""), 6000);
      load();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setDeleting(false);
    }
  };

  const openStatement = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    const res = await fetch(`/api/suppliers/${supplier.id}`);
    const data = await res.json();
    setStatement(data.statement || []);
    setStatBalance(data.balance || 0);
    setShowStatModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">الموردون</h1>
        <button onClick={openAdd} className="btn-primary">
          + إضافة مورد
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
                <th className="text-right py-3 px-4">الكود</th>
                <th className="text-right py-3 px-4">الاسم</th>
                <th className="text-right py-3 px-4">الهاتف</th>
                <th className="text-right py-3 px-4">البريد</th>
                <th className="text-right py-3 px-4">تاريخ الإضافة</th>
                <th className="text-right py-3 px-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : suppliers.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-gray-400">لا يوجد موردون</td></tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="table-row">
                    <td className="py-3 px-4 text-blue-600 font-mono">{s.code}</td>
                    <td className="py-3 px-4 font-medium">{s.name}</td>
                    <td className="py-3 px-4">{s.phone}</td>
                    <td className="py-3 px-4 text-gray-500">{s.email}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(s.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-3 items-center">
                        <button onClick={() => openStatement(s)} className="text-blue-600 hover:underline text-sm">
                          كشف حساب
                        </button>
                        <button onClick={() => openEdit(s)} className="text-gray-400 hover:text-blue-600">✏️</button>
                        <button onClick={() => { setDeleteTarget(s); setDeleteError(""); }} className="text-gray-400 hover:text-red-600">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setEditSupplier(null); }} title={editSupplier ? "تعديل مورد" : "إضافة مورد جديد"}>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الاسم *</label>
              <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الهاتف</label>
              <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">البريد الإلكتروني</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={2} />
          </div>
          {editSupplier && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <label className="block text-sm font-medium text-amber-800 mb-1">
                سبب التعديل * (سيُرسل الطلب لموافقة الشركاء الثلاثة قبل التنفيذ)
              </label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input-field" rows={2} required />
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowAddModal(false); setEditSupplier(null); }} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "جاري الحفظ..." : editSupplier ? "إرسال طلب التعديل" : "حفظ"}</button>
          </div>
        </form>
      </Modal>

      <Modal open={showStatModal} onClose={() => setShowStatModal(false)} title={`كشف حساب: ${selectedSupplier?.name}`} size="xl">
        <div className="mb-4 flex justify-between">
          <span className="text-sm text-gray-500">المورد: {selectedSupplier?.name}</span>
          <span className={`text-lg font-bold ${statBalance >= 0 ? "text-red-600" : "text-green-600"}`}>
            الرصيد: {formatCurrency(statBalance)} ريال
          </span>
        </div>
        <table className="w-full text-sm">
          <thead className="table-header">
            <tr>
              <th className="text-right py-2 px-3">التاريخ</th>
              <th className="text-right py-2 px-3">البيان</th>
              <th className="text-left py-2 px-3">مدين</th>
              <th className="text-left py-2 px-3">دائن</th>
              <th className="text-left py-2 px-3">الرصيد</th>
            </tr>
          </thead>
          <tbody>
            {statement.map((line, i) => (
              <tr key={i} className="table-row">
                <td className="py-2 px-3">{formatDate(line.date)}</td>
                <td className="py-2 px-3">{line.description || line.entryDescription}</td>
                <td className="py-2 px-3 text-left text-red-600">{line.debit > 0 ? formatCurrency(line.debit) : ""}</td>
                <td className="py-2 px-3 text-left text-green-600">{line.credit > 0 ? formatCurrency(line.credit) : ""}</td>
                <td className="py-2 px-3 text-left font-bold">{formatCurrency(line.balance)}</td>
              </tr>
            ))}
            {statement.length === 0 && <tr><td colSpan={5} className="py-6 text-center text-gray-400">لا توجد حركات</td></tr>}
          </tbody>
        </table>
      </Modal>

      <DeleteReasonModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        itemLabel={deleteTarget?.name || ""}
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
}
