import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AuctionControlClient from "./AuctionControlClient";

export default async function AuctionPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");
  return <AuctionControlClient />;
}
