export function SectionHead({ title, copy, action }) {
  return (
    <div className="section-head">
      <div>
        <h2 className="section-title">{title}</h2>
        <p className="section-copy">{copy}</p>
      </div>
      {action}
    </div>
  );
}

