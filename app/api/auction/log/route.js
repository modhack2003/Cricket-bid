import { NextResponse } from "next/server";
import { getAuctionLog } from "@/lib/auction";

export async function GET() {
  const log = await getAuctionLog();
  return NextResponse.json({ log });
}
