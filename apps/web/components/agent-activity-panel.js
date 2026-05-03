export function AgentActivityPanel({ agents }) {
  return (
    <div className="agent-panel">
      <div className="agent-panel-head">
        <div className="eyebrow">Agent Activity</div>
        <div className="agent-panel-caption">What the AI stack is doing right now</div>
      </div>
      <div className="agent-list">
        {agents.map((agent) => (
          <article key={agent.key} className="agent-row">
            <div className="agent-name">{agent.name}</div>
            <div className="agent-status">{agent.status}</div>
            <div className="agent-summary">{agent.summary}</div>
            <div className="agent-confidence">{agent.confidence}</div>
          </article>
        ))}
      </div>
    </div>
  );
}
