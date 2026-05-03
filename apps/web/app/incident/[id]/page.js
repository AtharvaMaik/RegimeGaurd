import { IncidentDetailClient } from "../../../components/incident-detail-client";
import { getApiBaseUrl } from "../../../lib/api";

export const dynamic = "force-dynamic";

export default async function IncidentPage({ params }) {
  const { id } = await params;
  return <IncidentDetailClient incidentId={id} apiBaseUrl={getApiBaseUrl()} />;
}
