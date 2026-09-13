"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";

export default function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-blue-900">
        <div className="text-white text-center">
          <div className="text-5xl mb-4 animate-pulse">💳</div>
          <p>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return <AppLayout>{children}</AppLayout>;
}
