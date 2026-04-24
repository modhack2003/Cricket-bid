import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import PlayersClient from "./PlayersClient";

export default async function PlayersPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");
  return <PlayersClient />;
}
