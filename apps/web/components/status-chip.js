import { buildStatusTone, titleCase } from "../lib/format";

export function StatusChip({ label }) {
  return (
    <span className="chip">
      <span className={`status-dot ${buildStatusTone(label)}`} />
      {titleCase(label.replaceAll("_", " "))}
    </span>
  );
}

