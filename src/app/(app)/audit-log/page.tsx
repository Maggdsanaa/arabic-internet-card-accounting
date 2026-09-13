"use client";

import { useEffect, useState } from "react";
import { formatDateTime } from "@/lib/utils";

interface AuditLogEntry {
  id: number;
  userId: number;
  userName: string;
  action: string;
  entityType: string;
  entityId: number;
  oldData: unknown;
  newData: unknown;
  ipAddress: string;
  createdAt: string;
}

const actionColors: Record<string, string> = {
  create: "badge-success",
  update: "badge-warning",
  delete: "badge-danger",
  login: "badge-info",
  "create_approval_request": "badge-warning",
  "partner_approve": "badge-success",
  "partner_reject": "badge-danger",
};

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    fetch("/api/audit-log?limit=200")
      .then((r) => r.json())
      .then(setLogs)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">سجل التدقيق</h1>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>🔒 سجل غير قابل للتعديل</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-blue-800 text-sm">
          📋 <strong>سجل التدقيق:</strong> يتتبع جميع العمليات والتعديلات في النظام. هذا السجل للقراءة فقط ولا يمكن تعديله.
        </p>
      </div>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="table-header">
              <tr>
                <th className="text-right py-3 px-4">#</th>
                <th className="text-right py-3 px-4">المستخدم</th>
                <th className="text-right py-3 px-4">الإجراء</th>
                <th className="text-right py-3 px-4">الجهة</th>
                <th className="text-right py-3 px-4">معرف السجل</th>
                <th className="text-right py-3 px-4">IP</th>
                <th className="text-right py-3 px-4">التاريخ والوقت</th>
                <th className="text-right py-3 px-4">تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">جاري التحميل...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={8} className="py-8 text-center text-gray-400">لا توجد سجلات</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="table-row">
                    <td className="py-3 px-4 text-gray-400">{log.id}</td>
                    <td className="py-3 px-4 font-medium">{log.userName}</td>
                    <td className="py-3 px-4">
                      <span className={actionColors[log.action] || "badge-info"}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600">{log.entityType}</td>
                    <td className="py-3 px-4 text-gray-500">{log.entityId || "—"}</td>
                    <td className="py-3 px-4 text-gray-400 font-mono text-xs">{log.ipAddress}</td>
                    <td className="py-3 px-4 text-gray-500 text-xs">{formatDateTime(log.createdAt)}</td>
                    <td className="py-3 px-4">
                      {(log.oldData != null || log.newData != null) && (
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="text-blue-600 hover:underline text-xs"
                        >
                          عرض
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail popup */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedLog(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold">تفاصيل السجل #{selectedLog.id}</h2>
              <button onClick={() => setSelectedLog(null)} className="text-gray-500">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">المستخدم:</span> {selectedLog.userName}</div>
                <div><span className="text-gray-500">الإجراء:</span> {selectedLog.action}</div>
                <div><span className="text-gray-500">الجهة:</span> {selectedLog.entityType}</div>
                <div><span className="text-gray-500">التاريخ:</span> {formatDateTime(selectedLog.createdAt)}</div>
              </div>
              {selectedLog.oldData != null && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">البيانات القديمة:</p>
                  <pre className="bg-red-50 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.oldData, null, 2)}
                  </pre>
                </div>
              )}
              {selectedLog.newData != null && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">البيانات الجديدة:</p>
                  <pre className="bg-green-50 p-3 rounded text-xs overflow-auto max-h-40">
                    {JSON.stringify(selectedLog.newData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
