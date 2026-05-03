export function buildSparklinePoints(values, width = 100, height = 100) {
  if (!values.length) {
    return "";
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return values
      .map((_, index) => {
        const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
        return `${x.toFixed(4)},${(height / 2).toFixed(4)}`;
      })
      .join(" ");
  }

  const range = max - min;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(4)},${y.toFixed(4)}`;
    })
    .join(" ");
}

export function summarizeSparkline(values) {
  if (!values.length) {
    return { min: 0, max: 0, latest: 0, delta: 0 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = values.at(-1);
  const delta = latest - values[0];

  return { min, max, latest, delta };
}
