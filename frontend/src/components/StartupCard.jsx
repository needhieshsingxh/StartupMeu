function formatAmount(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

export default function StartupCard({ startup, currentUser, onOpen, onEdit, onDelete }) {
  const currentUserId = currentUser?.id || currentUser?._id;
  const isOwner = Boolean(
    currentUserId &&
    startup.owner &&
    (String(startup.owner) === String(currentUserId) || String(startup.owner._id || '') === String(currentUserId))
  );

  return (
    <article className="startup-card">
      <div className="card-kicker">
        <span className="industry-label">{startup.industry}</span>
        <span className="stage-label">{startup.stage}</span>
      </div>
      <h3>{startup.name}</h3>
      <p className="startup-tagline">{startup.tagline || 'A startup seeking its next conversation.'}</p>
      <div className="card-facts">
        <span><span className="fact-label">Based in</span>{startup.location}</span>
        <span><span className="fact-label">Funding sought</span>{formatAmount(startup.fundingRequired)}</span>
      </div>
      <div className="card-bottom">
        <button className="text-link" type="button" onClick={() => onOpen(startup._id)}>
          View profile <span aria-hidden="true">↗</span>
        </button>
        {isOwner && (
          <div className="founder-actions" aria-label={`Manage ${startup.name} profile`}>
            <button type="button" onClick={() => onEdit(startup)} aria-label={`Edit ${startup.name}`}>Edit</button>
            <button type="button" onClick={() => onDelete(startup)} aria-label={`Delete ${startup.name}`}>Delete</button>
          </div>
        )}
      </div>
    </article>
  );
}
