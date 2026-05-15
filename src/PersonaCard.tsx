import type { SavedPersona } from "./api";

function formatCompactTimestamp(value: string) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) {
    return "Recent";
  }

  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / (1000 * 60)));
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type Props = {
  persona: SavedPersona;
  initials: string;
  onClick: () => void;
  disabled?: boolean;
};

export default function PersonaCard({ persona, initials, onClick, disabled }: Props) {
  return (
    <button
      className="persona-card"
      onClick={onClick}
      disabled={disabled}
      title={persona.name}
    >
      <div className="persona-card-avatar">{initials}</div>
      <div className="persona-card-content">
        <h3 className="persona-card-name">{persona.name}</h3>
        <p className="persona-card-timestamp">
          Last active {formatCompactTimestamp(persona.lastActive)}
        </p>
        <div className="persona-card-meta">
          <span className="meta-item">{persona.chatCount} {persona.chatCount === 1 ? "chat" : "chats"}</span>
          {persona.preview ? (
            <p className="persona-card-preview">{persona.preview}</p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
