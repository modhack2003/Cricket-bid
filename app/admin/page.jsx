import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import AdminDashboardClient from "./AdminDashboardClient";

export default async function AdminPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/");
  return <AdminDashboardClient />;
}
