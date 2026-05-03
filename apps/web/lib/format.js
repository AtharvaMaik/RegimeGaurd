export function formatPercent(value) {
  return `${(value * 100).toFixed(1)}%`;
}

export function titleCase(value) {
  return value.replace(/\b\w/g, (match) => match.toUpperCase());
}

export function buildStatusTone(value) {
  return `status-${value}`;
}

