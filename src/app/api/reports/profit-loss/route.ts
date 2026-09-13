import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getProfitAndLoss } from "@/lib/accounting";

export async function GET(req: NextRequest) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const result = await getProfitAndLoss(
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    return NextResponse.json({ error: "حدث خطأ" }, { status: 500 });
  }
}
