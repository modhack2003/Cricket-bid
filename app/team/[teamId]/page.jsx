import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import TeamDashClient from "./TeamDashClient";

const TEAM_MAP = { vipers: "team1", mongooses: "team2" };

export default async function TeamPage({ params }) {
  const { teamId } = await params;
  const session = await getSession();
  const expectedRole = TEAM_MAP[teamId];

  if (!session || session.role !== expectedRole) redirect("/");

  return <TeamDashClient teamId={teamId} />;
}
