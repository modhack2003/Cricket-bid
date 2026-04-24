import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TeamProfileClient from "./TeamProfileClient";

const TEAM_MAP = { vipers: "team1", mongooses: "team2" };

export default async function TeamProfilePage({ params }) {
  const { teamId } = await params;
  const session = await getSession();
  const expectedRole = TEAM_MAP[teamId];
  if (!session || session.role !== expectedRole) redirect("/");
  return <TeamProfileClient teamId={teamId} />;
}
