"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Customer {
  id: number;
  code: string;
  name: string;
  phone: string;
  email: string;
  creditLimit: string;
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
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    creditLimit: 0,
    notes: "",
    openingBalance: 0,
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

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error);
      }
      setShowAddModal(false);
      setForm({ name: "", phone: "", email: "", address: "", creditLimit: 0, notes: "", openingBalance: 0 });
      loadCustomers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
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
        <button onClick={() => setShowAddModal(true)} className="btn-primary">
          + إضافة عميل
        </button>
      </div>

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
                      <button
                        onClick={() => openStatement(customer)}
                        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        كشف حساب
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Customer Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="إضافة عميل جديد">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleAddSubmit} className="space-y-4">
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
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">
              إلغاء
            </button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "جاري الحفظ..." : "حفظ"}
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
    </div>
  );
}
