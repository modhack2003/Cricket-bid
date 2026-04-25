import { NextResponse } from "next/server";
import { getAuctionLog, clearAuctionLog } from "@/lib/auction";
import { getSession } from "@/lib/auth";

export async function GET() {
  const log = await getAuctionLog();
  return NextResponse.json({ log });
}

export async function DELETE() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await clearAuctionLog();
  return NextResponse.json({ success: true });
}
