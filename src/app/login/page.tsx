"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-400 rounded-2xl shadow-lg mb-4">
            <span className="text-4xl">💳</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">نظام المحاسبة</h1>
          <p className="text-blue-200">إدارة كروت الإنترنت</p>
        </div>

        {/* Login form */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-800 mb-6 text-center">
            تسجيل الدخول
          </h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 mb-4 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                اسم المستخدم
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="partner1"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-lg transition-colors"
            >
              {loading ? "جاري الدخول..." : "دخول"}
            </button>
          </form>

          {/* Demo accounts */}
          <div className="mt-6 border-t border-gray-100 pt-4">
            <p className="text-xs text-gray-500 mb-3 text-center">حسابات تجريبية:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { u: "partner1", p: "Partner1@2024", l: "الشريك 1" },
                { u: "partner2", p: "Partner2@2024", l: "الشريك 2" },
                { u: "partner3", p: "Partner3@2024", l: "الشريك 3" },
              ].map((acc) => (
                <button
                  key={acc.u}
                  type="button"
                  onClick={() => {
                    setUsername(acc.u);
                    setPassword(acc.p);
                  }}
                  className="bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg p-2 text-center transition-colors"
                >
                  <div className="font-medium text-gray-700">{acc.l}</div>
                  <div className="text-gray-400">{acc.u}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
