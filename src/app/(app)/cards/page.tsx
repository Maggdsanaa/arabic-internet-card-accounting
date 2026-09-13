"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatCurrency } from "@/lib/utils";

interface Card {
  id: number;
  name: string;
  cardType: string;
  speed: string;
  provider: string;
  purchasePrice: string;
  sellingPrice: string;
  quantity: number;
  minQuantity: number;
  isActive: boolean;
}

const cardTypeLabels: Record<string, string> = {
  daily: "يومي",
  weekly: "أسبوعي",
  monthly: "شهري",
  quarterly: "ربع سنوي",
  yearly: "سنوي",
  custom: "مخصص",
};

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCard, setEditCard] = useState<Card | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    cardType: "monthly" as Card["cardType"],
    durationDays: 30,
    speed: "",
    provider: "",
    purchasePrice: 0,
    sellingPrice: 0,
    quantity: 0,
    minQuantity: 5,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/cards");
    setCards(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openEdit = (card: Card) => {
    setEditCard(card);
    setForm({
      name: card.name,
      description: "",
      cardType: card.cardType as Card["cardType"],
      durationDays: 30,
      speed: card.speed,
      provider: card.provider,
      purchasePrice: parseFloat(card.purchasePrice),
      sellingPrice: parseFloat(card.sellingPrice),
      quantity: card.quantity,
      minQuantity: card.minQuantity,
    });
    setShowAddModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editCard ? `/api/cards/${editCard.id}` : "/api/cards";
      const method = editCard ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowAddModal(false);
      setEditCard(null);
      setForm({ name: "", description: "", cardType: "monthly", durationDays: 30, speed: "", provider: "", purchasePrice: 0, sellingPrice: 0, quantity: 0, minQuantity: 5 });
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const profit = (card: Card) => {
    const p = parseFloat(card.sellingPrice) - parseFloat(card.purchasePrice);
    const pct = parseFloat(card.purchasePrice) > 0 ? ((p / parseFloat(card.purchasePrice)) * 100).toFixed(1) : "0";
    return { amount: p, pct };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">كروت الإنترنت والمخزون</h1>
        <button onClick={() => { setEditCard(null); setShowAddModal(true); }} className="btn-primary">
          + إضافة كارت
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-gray-400">جاري التحميل...</div>
        ) : cards.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-400">لا توجد كروت</div>
        ) : (
          cards.map((card) => {
            const p = profit(card);
            const isLow = card.quantity <= card.minQuantity;
            return (
              <div key={card.id} className="card hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-gray-800">{card.name}</h3>
                    <div className="flex gap-2 mt-1">
                      <span className="badge-info">{cardTypeLabels[card.cardType]}</span>
                      {card.provider && <span className="badge-info">{card.provider}</span>}
                    </div>
                  </div>
                  <button onClick={() => openEdit(card)} className="text-gray-400 hover:text-blue-600">✏️</button>
                </div>

                {card.speed && (
                  <p className="text-sm text-gray-500 mb-3">السرعة: {card.speed}</p>
                )}

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">سعر الشراء</p>
                    <p className="font-bold text-gray-800">{formatCurrency(card.purchasePrice)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2">
                    <p className="text-xs text-gray-500">سعر البيع</p>
                    <p className="font-bold text-blue-700">{formatCurrency(card.sellingPrice)}</p>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className={`rounded-lg px-3 py-1 text-sm font-medium ${isLow ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                    المخزون: {card.quantity}
                    {isLow && " ⚠️"}
                  </div>
                  <div className="text-sm">
                    <span className="text-green-600 font-medium">+{formatCurrency(p.amount)}</span>
                    <span className="text-gray-400 text-xs"> ({p.pct}%)</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal open={showAddModal} onClose={() => { setShowAddModal(false); setEditCard(null); }} title={editCard ? "تعديل كارت" : "إضافة كارت جديد"}>
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">اسم الكارت *</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
              <select value={form.cardType} onChange={(e) => setForm({ ...form, cardType: e.target.value as Card["cardType"] })} className="input-field">
                {Object.entries(cardTypeLabels).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المزود</label>
              <input type="text" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="input-field" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">السرعة</label>
            <input type="text" value={form.speed} onChange={(e) => setForm({ ...form, speed: e.target.value })} className="input-field" placeholder="مثال: 10 Mbps" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر الشراء</label>
              <input type="number" value={form.purchasePrice} onChange={(e) => setForm({ ...form, purchasePrice: parseFloat(e.target.value) || 0 })} className="input-field" min="0" step="0.01" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">سعر البيع</label>
              <input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: parseFloat(e.target.value) || 0 })} className="input-field" min="0" step="0.01" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الحالية</label>
              <input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} className="input-field" min="0" disabled={!!editCard} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">الحد الأدنى للمخزون</label>
              <input type="number" value={form.minQuantity} onChange={(e) => setForm({ ...form, minQuantity: parseInt(e.target.value) || 0 })} className="input-field" min="0" />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => { setShowAddModal(false); setEditCard(null); }} className="btn-secondary">إلغاء</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "جاري الحفظ..." : "حفظ"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
