"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";

interface JournalEntry {
  id: number;
  entryNumber: string;
  date: string;
  description: string;
  transactionType: string;
  totalDebit: string;
  totalCredit: string;
  isVoid: boolean;
}

interface Account {
  id: number;
  code: string;
  nameAr: string;
}

interface JournalLine {
  accountId: number;
  description: string;
  debit: number;
  credit: number;
}

interface EntryDetail {
  entry: JournalEntry;
  lines: Array<{
    id: number;
    accountId: number;
    accountName: string;
    accountCode: string;
    description: string;
    debit: string;
    credit: string;
  }>;
}

const typeLabels: Record<string, string> = {
  sale: "مبيعات",
  purchase: "مشتريات",
  payment: "دفعة",
  receipt: "تحصيل",
  expense: "مصروف",
  journal: "قيد يومي",
  opening_balance: "رصيد افتتاحي",
  partner_deposit: "إيداع شريك",
  partner_withdrawal: "سحب شريك",
  profit_distribution: "توزيع أرباح",
};

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<EntryDetail | null>(null);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    description: "",
    lines: [
      { accountId: 0, description: "", debit: 0, credit: 0 },
      { accountId: 0, description: "", debit: 0, credit: 0 },
    ] as JournalLine[],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const [er, ar] = await Promise.all([
      fetch("/api/journal"),
      fetch("/api/accounts"),
    ]);
    setEntries(await er.json());
    setAccounts(await ar.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (entry: JournalEntry) => {
    const res = await fetch(`/api/journal/${entry.id}`);
    const data = await res.json();
    setSelectedEntry(data);
    setShowDetailModal(true);
  };

  const addLine = () => setForm({ ...form, lines: [...form.lines, { accountId: 0, description: "", debit: 0, credit: 0 }] });
  const removeLine = (idx: number) => setForm({ ...form, lines: form.lines.filter((_, i) => i !== idx) });

  const updateLine = (idx: number, field: keyof JournalLine, value: number | string) => {
    const lines = [...form.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    setForm({ ...form, lines });
  };

  const totalDebit = form.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = form.lines.reduce((s, l) => s + l.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      setError("القيد غير متوازن: المدين لا يساوي الدائن");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/journal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowAddModal(false);
      setForm({ date: new Date().toISOString().split("T")[0], description: "", lines: [{ accountId: 0, description: "", debit: 0, credit: 0 }, { accountId: 0, description: "", debit: 0, credit: 0 }] });
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
        <h1 className="text-2xl font-bold text-gray-800">القيود اليومية</h1>
        <button onClick={() => setShowAddModal(true)} className="btn-primary">+ قيد جديد</button>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">رقم القيد</th>
                <th className="text-right py-3 px-4">التاريخ</th>
                <th className="text-right py-3 px-4">البيان</th>
                <th className="text-right py-3 px-4">النوع</th>
                <th className="text-left py-3 px-4">المدين</th>
                <th className="text-left py-3 px-4">الدائن</th>
                <th className="text-right py-3 px-4">الحالة</th>
                <th className="text-right py-3 px-4">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">لا توجد قيود</td></tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className={`table-row ${e.isVoid ? "opacity-50" : ""}`}>
                    <td className="py-3 px-4 text-blue-600 font-mono">{e.entryNumber}</td>
                    <td className="py-3 px-4 text-gray-500">{formatDate(e.date)}</td>
                    <td className="py-3 px-4">{e.description}</td>
                    <td className="py-3 px-4">
                      <span className="badge-info">{typeLabels[e.transactionType] || e.transactionType}</span>
                    </td>
                    <td className="py-3 px-4 text-left font-medium text-red-600">{formatCurrency(e.totalDebit)}</td>
                    <td className="py-3 px-4 text-left font-medium text-green-600">{formatCurrency(e.totalCredit)}</td>
                    <td className="py-3 px-4">
                      {e.isVoid ? <span className="badge-danger">ملغى</span> : <span className="badge-success">نشط</span>}
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => openDetail(e)} className="text-blue-600 hover:underline text-sm">عرض</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Journal Entry Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="قيد محاسبي جديد" size="xl">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">البيان</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field" required />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">سطور القيد</label>
              <button type="button" onClick={addLine} className="text-blue-600 text-sm hover:underline">+ إضافة سطر</button>
            </div>

            {/* Header */}
            <div className="grid grid-cols-12 gap-2 text-xs text-gray-500 mb-1 px-1">
              <div className="col-span-4">الحساب</div>
              <div className="col-span-3">البيان</div>
              <div className="col-span-2 text-left">مدين</div>
              <div className="col-span-2 text-left">دائن</div>
              <div className="col-span-1"></div>
            </div>

            <div className="space-y-2">
              {form.lines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-4">
                    <select value={line.accountId} onChange={(e) => updateLine(idx, "accountId", parseInt(e.target.value))} className="input-field text-sm" required>
                      <option value={0}>-- اختر الحساب --</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.nameAr}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <input type="text" value={line.description} onChange={(e) => updateLine(idx, "description", e.target.value)} className="input-field text-sm" placeholder="البيان" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={line.debit} onChange={(e) => updateLine(idx, "debit", parseFloat(e.target.value) || 0)} className="input-field text-sm" min="0" step="0.01" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={line.credit} onChange={(e) => updateLine(idx, "credit", parseFloat(e.target.value) || 0)} className="input-field text-sm" min="0" step="0.01" />
                  </div>
                  <div className="col-span-1">
                    {form.lines.length > 2 && (
                      <button type="button" onClick={() => removeLine(idx)} className="text-red-500 hover:text-red-700">✕</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className={`mt-3 p-3 rounded-lg ${isBalanced ? "bg-green-50" : "bg-red-50"}`}>
              <div className="flex justify-between text-sm">
                <span>إجمالي المدين:</span>
                <span className="font-bold">{formatCurrency(totalDebit)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>إجمالي الدائن:</span>
                <span className="font-bold">{formatCurrency(totalCredit)}</span>
              </div>
              <div className={`flex justify-between text-sm font-bold mt-1 ${isBalanced ? "text-green-600" : "text-red-600"}`}>
                <span>الفرق:</span>
                <span>{isBalanced ? "✅ متوازن" : `❌ ${formatCurrency(Math.abs(totalDebit - totalCredit))}`}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={saving || !isBalanced} className="btn-primary disabled:opacity-50">
              {saving ? "جاري الحفظ..." : "حفظ القيد"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Entry Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title={`تفاصيل القيد: ${selectedEntry?.entry.entryNumber}`} size="lg">
        {selectedEntry && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">التاريخ:</span>
                <span className="font-medium mr-2">{formatDate(selectedEntry.entry.date)}</span>
              </div>
              <div>
                <span className="text-gray-500">النوع:</span>
                <span className="badge-info mr-2">{typeLabels[selectedEntry.entry.transactionType]}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">البيان:</span>
                <span className="font-medium mr-2">{selectedEntry.entry.description}</span>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="table-header">
                <tr>
                  <th className="text-right py-2 px-3">الحساب</th>
                  <th className="text-right py-2 px-3">البيان</th>
                  <th className="text-left py-2 px-3">مدين</th>
                  <th className="text-left py-2 px-3">دائن</th>
                </tr>
              </thead>
              <tbody>
                {selectedEntry.lines.map((line) => (
                  <tr key={line.id} className="table-row">
                    <td className="py-2 px-3">
                      <span className="text-xs text-gray-400 ml-1">{line.accountCode}</span>
                      {line.accountName}
                    </td>
                    <td className="py-2 px-3 text-gray-500">{line.description}</td>
                    <td className="py-2 px-3 text-left text-red-600 font-medium">{parseFloat(line.debit) > 0 ? formatCurrency(line.debit) : ""}</td>
                    <td className="py-2 px-3 text-left text-green-600 font-medium">{parseFloat(line.credit) > 0 ? formatCurrency(line.credit) : ""}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-bold">
                <tr>
                  <td colSpan={2} className="py-2 px-3">الإجمالي</td>
                  <td className="py-2 px-3 text-left text-red-600">{formatCurrency(selectedEntry.entry.totalDebit)}</td>
                  <td className="py-2 px-3 text-left text-green-600">{formatCurrency(selectedEntry.entry.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Modal>
    </div>
  );
}
