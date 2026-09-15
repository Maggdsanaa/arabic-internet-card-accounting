"use client";

import { useState } from "react";
import Modal from "@/components/Modal";

export default function DeleteReasonModal({
  open,
  onClose,
  onConfirm,
  itemLabel,
  loading,
  error,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  itemLabel: string;
  loading?: boolean;
  error?: string;
}) {
  const [reason, setReason] = useState("");

  return (
    <Modal open={open} onClose={onClose} title={`طلب حذف: ${itemLabel}`}>
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
          🔒 لن يتم الحذف فورًا — سيُرسل طلب لموافقة الشركاء الثلاثة، ولا يُنفذ
          إلا بعد موافقتهم جميعًا.
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            سبب الحذف *
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="input-field"
            rows={3}
            required
          />
        </div>
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-secondary">
            إلغاء
          </button>
          <button
            type="button"
            disabled={loading || reason.trim().length === 0}
            onClick={() => onConfirm(reason)}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? "جاري الإرسال..." : "إرسال طلب الحذف"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
