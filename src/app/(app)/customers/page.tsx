"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import DeleteReasonModal from "@/components/DeleteReasonModal";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  address?: string;
  creditLimit: string;
  notes?: string;
  createdAt: string;
}

interface Statement {
  id: number;
  entryNumber: string;
  date: string;
  description: string;
  entryDescription: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showStatModal, setShowStatModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [statement, setStatement] = useState<Statement[]>([]);
  const [statBalance, setStatBalance] = useState(0);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    creditLimit: 0,
    notes: "",
    openingBalance: 0,
    reason: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadCustomers = async (q = "") => {
    setLoading(true);
    const url = q ? `/api/customers?search=${encodeURIComponent(q)}` : "/api/customers";
    const res = await fetch(url);
    const data = await res.json();
    setCustomers(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadCustomers(search);
  };

  const openAdd = () => {
    setEditCustomer(null);
    setForm({ name: "", phone: "", email: "", address: "", creditLimit: 0, notes: "", openingBalance: 0, reason: "" });
    setShowAddModal(true);
  };

  const openEdit = (customer: Customer) => {
    setEditCustomer(customer);
    setForm({
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      address: customer.address || "",
      creditLimit: parseFloat(customer.creditLimit) || 0,
      notes: customer.notes || "",
      openingBalance: 0,
      reason: "",
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editCustomer ? `/api/customers/${editCustomer.id}` : "/api/customers";
      const method = editCustomer ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setShowAddModal(false);
      setEditCustomer(null);
      setForm({ name: "", phone: "", email: "", address: "", creditLimit: 0, notes: "", openingBalance: 0, reason: "" });
      if (res.status === 202) {
        setNotice(data.message || "تم إرسال الطلب للموافقة");
        setTimeout(() => setNotice(""), 6000);
      }
      loadCustomers();
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
      const res = await fetch(`/api/customers/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeleteTarget(null);
      setNotice(data.message || "تم إرسال طلب الحذف للموافقة");
      setTimeout(() => setNotice(""), 6000);
      loadCustomers();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setDeleting(false);
    }
  };

  const openStatement = async (customer: Customer) => {
    setSelectedCustomer(customer);
    const res = await fetch(`/api/customers/${customer.id}`);
    const data = await res.json();
    setStatement(data.statement || []);
    setStatBalance(data.balance || 0);
    setShowStatModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">العملاء</h1>
        <button onClick={openAdd} className="btn-primary">
          + إضافة عميل
        </button>
      </div>

      {notice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-sm">
          ℹ️ {notice}
        </div>
      )}

      {/* Search */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم أو الهاتف..."
            className="input-field flex-1"
          />
          <button type="submit" className="btn-primary">بحث</button>
          <button type="button" onClick={() => { setSearch(""); loadCustomers(); }} className="btn-secondary">
            إعادة تعيين
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">الكود</th>
                <th className="text-right py-3 px-4">الاسم</th>
                <th className="text-right py-3 px-4">الهاتف</th>
                <th className="text-right py-3 px-4">حد الائتمان</th>
                <th className="text-right py-3 px-4">تاريخ الإضافة</th>
                <th className="text-right py-3 px-4">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    جاري التحميل...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-400">
                    لا يوجد عملاء
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="table-row">
                    <td className="py-3 px-4 text-blue-600 font-mono">{customer.code}</td>
                    <td className="py-3 px-4 font-medium text-gray-800">{customer.name}</td>
                    <td className="py-3 px-4 text-gray-600">{customer.phone}</td>
                    <td className="py-3 px-4">
                      {formatCurrency(customer.creditLimit)} ريال
                    </td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(customer.createdAt)}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-3 items-center">
                        <button
                          onClick={() => openStatement(customer)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          كشف حساب
                        </button>
                        <button onClick={() => openEdit(customer)} className="text-gray-400 hover:text-blue-600">✏️</button>
                        <button onClick={() => { setDeleteTarget(customer); setDeleteError(""); }} className="text-gray-400 hover:text-red-600">🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Customer Modal */}
      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setEditCustomer(null); }} title={editCustomer ? "تعديل عميل" : "إضافة عميل جديد"}>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الاسم *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الهاتف
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                حد الائتمان (ريال)
              </label>
              <input
                type="number"
                value={form.creditLimit}
                onChange={(e) => setForm({ ...form, creditLimit: parseFloat(e.target.value) || 0 })}
                className="input-field"
                min="0"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              العنوان
            </label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input-field"
            />
          </div>
          {!editCustomer && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                الرصيد الافتتاحي (ريال)
              </label>
              <input
                type="number"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: parseFloat(e.target.value) || 0 })}
                className="input-field"
                min="0"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ملاحظات
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="input-field"
              rows={2}
            />
          </div>
          {editCustomer && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <label className="block text-sm font-medium text-amber-800 mb-1">
                سبب التعديل * (سيُرسل الطلب لموافقة الشركاء الثلاثة قبل التنفيذ)
              </label>
              <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input-field" rows={2} required />
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowAddModal(false); setEditCustomer(null); }} className="btn-secondary">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "جاري الحفظ..." : editCustomer ? "إرسال طلب التعديل" : "حفظ"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Statement Modal */}
      <Modal
        open={showStatModal}
        onClose={() => setShowStatModal(false)}
        title={`كشف حساب: ${selectedCustomer?.name}`}
        size="xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            العميل: {selectedCustomer?.name} | الكود: {selectedCustomer?.code}
          </div>
          <div className={`text-lg font-bold ${statBalance >= 0 ? "text-red-600" : "text-green-600"}`}>
            الرصيد الحالي: {formatCurrency(statBalance)} ريال
          </div>
        </div>

        <div className="overflow-x-auto">
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
                  <td className="py-2 px-3 text-gray-500">{formatDate(line.date)}</td>
                  <td className="py-2 px-3">{line.description || line.entryDescription}</td>
                  <td className="py-2 px-3 text-left text-red-600 font-medium">
                    {line.debit > 0 ? formatCurrency(line.debit) : ""}
                  </td>
                  <td className="py-2 px-3 text-left text-green-600 font-medium">
                    {line.credit > 0 ? formatCurrency(line.credit) : ""}
                  </td>
                  <td className="py-2 px-3 text-left font-bold">
                    {formatCurrency(line.balance)}
                  </td>
                </tr>
              ))}
              {statement.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-400">
                    لا توجد حركات
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex justify-end gap-3">
          <button onClick={() => window.print()} className="btn-secondary">
            🖨️ طباعة
          </button>
        </div>
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
