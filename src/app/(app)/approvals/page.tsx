"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/Modal";
import { formatDateTime } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface ApprovalRequest {
  id: number;
  requestNumber: string;
  operationType: string;
  entityType: string;
  entityId: number;
  reason: string;
  status: string;
  requestedBy: number;
  partner1Id: number;
  partner1Status: string;
  partner1Comment: string;
  partner1ActionAt: string;
  partner2Id: number;
  partner2Status: string;
  partner2Comment: string;
  partner2ActionAt: string;
  partner3Id: number;
  partner3Status: string;
  partner3Comment: string;
  partner3ActionAt: string;
  oldData: unknown;
  newData: unknown;
  createdAt: string;
}

const statusLabel: Record<string, string> = {
  pending: "معلق",
  approved: "موافق عليه",
  rejected: "مرفوض",
  cancelled: "ملغى",
};

const statusColor: Record<string, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  rejected: "badge-danger",
  cancelled: "badge-info",
};

const opTypeLabel: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
  approve: "موافقة",
  reject: "رفض",
};

export default function ApprovalsPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("pending");
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [actionComment, setActionComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = async (status = activeTab) => {
    setLoading(true);
    const res = await fetch(`/api/approvals?status=${status}`);
    setRequests(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, [activeTab]);

  const openDetail = (req: ApprovalRequest) => {
    setSelectedRequest(req);
    setActionComment("");
    setActionError("");
    setShowDetailModal(true);
  };

  const handleAction = async (action: "approve" | "reject") => {
    if (!selectedRequest) return;
    setActionLoading(true);
    setActionError("");
    try {
      const res = await fetch(`/api/approvals/${selectedRequest.id}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: actionComment }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setShowDetailModal(false);
      load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setActionLoading(false);
    }
  };

  const canVote = (req: ApprovalRequest) => {
    if (user?.role !== "partner") return false;
    if (req.status !== "pending") return false;
    return true;
  };

  const getPartnerStatus = (req: ApprovalRequest, partnerNum: 1 | 2 | 3) => {
    const statuses = {
      1: req.partner1Status,
      2: req.partner2Status,
      3: req.partner3Status,
    };
    return statuses[partnerNum];
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">طلبات الموافقة الثلاثية</h1>

      {/* Info Box */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <p className="text-amber-800 text-sm">
          ⚠️ <strong>نظام الموافقة الثلاثية:</strong> أي تعديل أو حذف لعملية مالية يتطلب موافقة الشركاء الثلاثة.
          في حال رفض أي شريك، لا ينفذ الطلب.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {["pending", "approved", "rejected", "cancelled"].map((status) => (
          <button
            key={status}
            onClick={() => setActiveTab(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === status
                ? "bg-blue-700 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {statusLabel[status]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">رقم الطلب</th>
                <th className="text-right py-3 px-4">النوع</th>
                <th className="text-right py-3 px-4">الجهة</th>
                <th className="text-right py-3 px-4">السبب</th>
                <th className="text-right py-3 px-4">الشريك 1</th>
                <th className="text-right py-3 px-4">الشريك 2</th>
                <th className="text-right py-3 px-4">الشريك 3</th>
                <th className="text-right py-3 px-4">الحالة</th>
                <th className="text-right py-3 px-4">التاريخ</th>
                <th className="text-right py-3 px-4">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : requests.length === 0 ? (
                <tr><td colSpan={10} className="py-8 text-center text-gray-400">لا توجد طلبات</td></tr>
              ) : (
                requests.map((req) => (
                  <tr key={req.id} className="table-row">
                    <td className="py-3 px-4 font-mono text-blue-600">{req.requestNumber}</td>
                    <td className="py-3 px-4">
                      <span className="badge-info">{opTypeLabel[req.operationType]}</span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{req.entityType}</td>
                    <td className="py-3 px-4 text-gray-700 max-w-xs truncate">{req.reason}</td>
                    <td className="py-3 px-4">
                      <span className={statusColor[getPartnerStatus(req, 1)] || "badge-info"}>
                        {statusLabel[getPartnerStatus(req, 1)]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={statusColor[getPartnerStatus(req, 2)] || "badge-info"}>
                        {statusLabel[getPartnerStatus(req, 2)]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={statusColor[getPartnerStatus(req, 3)] || "badge-info"}>
                        {statusLabel[getPartnerStatus(req, 3)]}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={statusColor[req.status] || "badge-info"}>
                        {statusLabel[req.status]}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{formatDateTime(req.createdAt)}</td>
                    <td className="py-3 px-4">
                      <button onClick={() => openDetail(req)} className="text-blue-600 hover:underline text-sm">
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

      {/* Detail Modal */}
      <Modal open={showDetailModal} onClose={() => setShowDetailModal(false)} title={`طلب موافقة: ${selectedRequest?.requestNumber}`} size="lg">
        {selectedRequest && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">نوع العملية:</span>
                <span className="font-medium mr-2">{opTypeLabel[selectedRequest.operationType]}</span>
              </div>
              <div>
                <span className="text-gray-500">الجهة:</span>
                <span className="font-medium mr-2">{selectedRequest.entityType}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-500">السبب:</span>
                <span className="font-medium mr-2">{selectedRequest.reason}</span>
              </div>
            </div>

            {/* Data comparison */}
            {selectedRequest.oldData != null && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">البيانات القديمة</p>
                  <pre className="bg-red-50 p-3 rounded-lg text-xs overflow-auto max-h-32 text-right">
                    {JSON.stringify(selectedRequest.oldData as object, null, 2)}
                  </pre>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">البيانات الجديدة</p>
                  <pre className="bg-green-50 p-3 rounded-lg text-xs overflow-auto max-h-32 text-right">
                    {JSON.stringify(selectedRequest.newData as object, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Partner statuses */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">حالة موافقة الشركاء:</p>
              <div className="space-y-2">
                {[1, 2, 3].map((n) => {
                  const num = n as 1 | 2 | 3;
                  const status = getPartnerStatus(selectedRequest, num);
                  const comment = selectedRequest[`partner${num}Comment` as keyof ApprovalRequest] as string;
                  const actionAt = selectedRequest[`partner${num}ActionAt` as keyof ApprovalRequest] as string;
                  return (
                    <div key={n} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <span className="font-medium text-sm">الشريك {n}</span>
                        {comment && <p className="text-xs text-gray-500 mt-1">{String(comment)}</p>}
                        {actionAt && <p className="text-xs text-gray-400">{formatDateTime(String(actionAt))}</p>}
                      </div>
                      <span className={statusColor[status] || "badge-info"}>{statusLabel[status]}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action buttons for partners */}
            {canVote(selectedRequest) && (
              <div className="border-t border-gray-200 pt-4">
                {actionError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-3 text-sm">
                    {actionError}
                  </div>
                )}
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">تعليق (اختياري)</label>
                  <textarea
                    value={actionComment}
                    onChange={(e) => setActionComment(e.target.value)}
                    className="input-field"
                    rows={2}
                    placeholder="أضف تعليقاً..."
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={actionLoading}
                    className="flex-1 btn-success"
                  >
                    ✅ موافقة
                  </button>
                  <button
                    onClick={() => handleAction("reject")}
                    disabled={actionLoading}
                    className="flex-1 btn-danger"
                  >
                    ❌ رفض
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
