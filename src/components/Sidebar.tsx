"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "📊" },
  { href: "/customers", label: "العملاء", icon: "👥" },
  { href: "/suppliers", label: "الموردون", icon: "🏭" },
  { href: "/cards", label: "كروت الإنترنت", icon: "💳" },
  { href: "/sales", label: "المبيعات", icon: "🛒" },
  { href: "/purchases", label: "المشتريات", icon: "📦" },
  { href: "/expenses", label: "المصروفات", icon: "💸" },
  { href: "/payments", label: "الخزينة والمدفوعات", icon: "🏦" },
  { href: "/journal", label: "القيود اليومية", icon: "📔" },
  { href: "/accounts", label: "دليل الحسابات", icon: "📋" },
  { href: "/partners", label: "حسابات الشركاء", icon: "🤝" },
  { href: "/reports", label: "الأرباح والتقارير", icon: "📈" },
  { href: "/approvals", label: "طلبات الموافقة", icon: "✅" },
  { href: "/audit-log", label: "سجل التدقيق", icon: "🔍", adminOnly: true },
];

export default function Sidebar({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const filteredItems = navItems.filter(
    (item) => !item.adminOnly || user?.role === "admin" || user?.role === "partner"
  );

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 right-0 h-full w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white z-50 transform transition-transform duration-300 lg:translate-x-0 flex flex-col",
          open ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-blue-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-400 rounded-lg flex items-center justify-center text-blue-900 font-bold text-lg">
              💳
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight">نظام المحاسبة</h1>
              <p className="text-blue-300 text-xs">كروت الإنترنت</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="p-4 border-b border-blue-700">
          <p className="text-sm font-medium">{user?.name}</p>
          <p className="text-blue-300 text-xs">
            {user?.role === "admin"
              ? "مدير"
              : user?.role === "partner"
              ? "شريك"
              : user?.role === "accountant"
              ? "محاسب"
              : "مشاهد"}
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2">
          {filteredItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                pathname === item.href || pathname.startsWith(item.href + "/")
                  ? "bg-blue-700 text-white font-medium"
                  : "text-blue-100 hover:bg-blue-700/50"
              )}
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-blue-700">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-blue-100 hover:bg-blue-700/50 rounded-lg transition-colors"
          >
            <span>🚪</span>
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}
