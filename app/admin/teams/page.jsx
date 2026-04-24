import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TeamsClient from "./TeamsClient";

export default async function TeamsPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");
  return <TeamsClient />;
}
