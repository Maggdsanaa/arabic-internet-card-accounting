"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface PartnerData {
  id: number;
  name: string;
  phone: string;
  sharePercentage: string;
  capitalBalance: number;
  drawingsBalance: number;
  netCapital: number;
}

interface PartnerDetail {
  partner: PartnerData;
  capitalBalance: number;
  drawingsBalance: number;
  capitalStatement: StatLine[];
  drawingsStatement: StatLine[];
}

interface StatLine {
  date: string;
  entryDescription: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
}

export default function PartnersPage() {
  const { user } = useAuth();
  const [partners, setPartners] = useState<PartnerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState<PartnerDetail | null>(null);
  const [editTarget, setEditTarget] = useState<PartnerData | null>(null);
  const [newName, setNewName] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/partners");
    setPartners(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (partner: PartnerData) => {
    const res = await fetch(`/api/partners?id=${partner.id}`);
    const data = await res.json();
    setSelectedPartner(data);
    setShowDetailModal(true);
  };

  const totalCapital = partners.reduce((s, p) => s + p.capitalBalance, 0);
  const totalDrawings = partners.reduce((s, p) => s + p.drawingsBalance, 0);
  const totalNet = partners.reduce((s, p) => s + p.netCapital, 0);

  const openRename = (p: PartnerData) => {
    setEditTarget(p);
    setNewName(p.name);
    setEditReason("");
    setEditError("");
  };

  const handleRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setEditError("");
    try {
      const res = await fetch(`/api/partners/${editTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, reason: editReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditTarget(null);
      setNotice(data.message || "تم إرسال الطلب للموافقة");
      setTimeout(() => setNotice(""), 6000);
      load();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">حسابات الشركاء</h1>

      {notice && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg p-3 text-sm">
          ℹ️ {notice}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card bg-blue-50 border-blue-100">
          <p className="text-sm text-blue-600 mb-1">إجمالي رأس المال</p>
          <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalCapital)} ريال</p>
        </div>
        <div className="card bg-red-50 border-red-100">
          <p className="text-sm text-red-600 mb-1">إجمالي المسحوبات</p>
          <p className="text-2xl font-bold text-red-800">{formatCurrency(totalDrawings)} ريال</p>
        </div>
        <div className="card bg-green-50 border-green-100">
          <p className="text-sm text-green-600 mb-1">صافي حقوق الملكية</p>
          <p className="text-2xl font-bold text-green-800">{formatCurrency(totalNet)} ريال</p>
        </div>
      </div>

      {/* Partners Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">الشريك</th>
                <th className="text-right py-3 px-4">الهاتف</th>
                <th className="text-right py-3 px-4">نسبة الحصة</th>
                <th className="text-left py-3 px-4">رأس المال</th>
                <th className="text-left py-3 px-4">المسحوبات</th>
                <th className="text-left py-3 px-4">صافي الحصة</th>
                <th className="text-right py-3 px-4">كشف الحساب</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : (
                partners.map((p) => (
                  <tr key={p.id} className="table-row">
                    <td className="py-3 px-4 font-medium text-gray-800">
                      <div className="flex items-center gap-2">
                        {p.name}
                        <button onClick={() => openRename(p)} className="text-gray-400 hover:text-blue-600" title="تعديل الاسم">✏️</button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-500">{p.phone}</td>
                    <td className="py-3 px-4">
                      <span className="badge-info">{p.sharePercentage}%</span>
                    </td>
                    <td className="py-3 px-4 text-left text-blue-700 font-medium">{formatCurrency(p.capitalBalance)}</td>
                    <td className="py-3 px-4 text-left text-red-600 font-medium">{formatCurrency(p.drawingsBalance)}</td>
                    <td className="py-3 px-4 text-left font-bold">
                      <span className={p.netCapital >= 0 ? "text-green-700" : "text-red-700"}>
                        {formatCurrency(p.netCapital)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button onClick={() => openDetail(p)} className="text-blue-600 hover:underline text-sm">
                        عرض
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Partner Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title={`كشف حساب: ${selectedPartner?.partner.name}`} size="xl">
        {selectedPartner && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-xs text-blue-600 mb-1">رأس المال</p>
                <p className="font-bold text-blue-800">{formatCurrency(selectedPartner.capitalBalance)}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-xs text-red-600 mb-1">المسحوبات</p>
                <p className="font-bold text-red-800">{formatCurrency(selectedPartner.drawingsBalance)}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-xs text-green-600 mb-1">صافي الحصة</p>
                <p className="font-bold text-green-800">
                  {formatCurrency(selectedPartner.capitalBalance - selectedPartner.drawingsBalance)}
                </p>
              </div>
            </div>

            {/* Capital Statement */}
            <div>
              <h3 className="font-bold text-gray-700 mb-3">حساب رأس المال</h3>
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
                  {selectedPartner.capitalStatement.map((line, i) => (
                    <tr key={i} className="table-row">
                      <td className="py-2 px-3">{formatDate(line.date)}</td>
                      <td className="py-2 px-3">{line.description || line.entryDescription}</td>
                      <td className="py-2 px-3 text-left text-red-600">{line.debit > 0 ? formatCurrency(line.debit) : ""}</td>
                      <td className="py-2 px-3 text-left text-green-600">{line.credit > 0 ? formatCurrency(line.credit) : ""}</td>
                      <td className="py-2 px-3 text-left font-bold">{formatCurrency(line.balance)}</td>
                    </tr>
                  ))}
                  {selectedPartner.capitalStatement.length === 0 && (
                    <tr><td colSpan={5} className="py-4 text-center text-gray-400">لا توجد حركات</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Drawings Statement */}
            <div>
              <h3 className="font-bold text-gray-700 mb-3">حساب المسحوبات</h3>
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
                  {selectedPartner.drawingsStatement.map((line, i) => (
                    <tr key={i} className="table-row">
                      <td className="py-2 px-3">{formatDate(line.date)}</td>
                      <td className="py-2 px-3">{line.description || line.entryDescription}</td>
                      <td className="py-2 px-3 text-left text-red-600">{line.debit > 0 ? formatCurrency(line.debit) : ""}</td>
                      <td className="py-2 px-3 text-left text-green-600">{line.credit > 0 ? formatCurrency(line.credit) : ""}</td>
                      <td className="py-2 px-3 text-left font-bold">{formatCurrency(line.balance)}</td>
                    </tr>
                  ))}
                  {selectedPartner.drawingsStatement.length === 0 && (
                    <tr><td colSpan={5} className="py-4 text-center text-gray-400">لا توجد حركات</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Modal>

      {/* Rename Partner Modal */}
      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`تعديل اسم: ${editTarget?.name}`}>
        {editError && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{editError}</div>}
        <form onSubmit={handleRename} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الجديد *</label>
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="input-field" required />
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <label className="block text-sm font-medium text-amber-800 mb-1">
              سبب التعديل * (سيُرسل الطلب لموافقة الشركاء الثلاثة قبل التنفيذ)
            </label>
            <textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} className="input-field" rows={2} required />
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setEditTarget(null)} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "جاري الإرسال..." : "إرسال طلب التعديل"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
