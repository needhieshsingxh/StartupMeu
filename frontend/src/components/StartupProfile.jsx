import { useEffect, useState } from 'react';
import { getConnectionRequests } from '../api';

function formatAmount(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
}

function ConnectionRequestsList({ startupId }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getConnectionRequests(startupId)
      .then((result) => setRequests(result?.data || []))
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [startupId]);

  return (
    <div className="connection-form" style={{ maxHeight: 380, overflowY: 'auto' }}>
      <p className="eyebrow">FOUNDER INBOX</p>
      <h3>Investor Introductions ({requests.length})</h3>
      {loading ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>Loading introduction requests…</p>
      ) : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : requests.length === 0 ? (
        <p style={{ color: 'var(--muted)', fontSize: 13 }}>No introduction requests received yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
          {requests.map((req) => (
            <div
              key={req._id}
              style={{
                background: 'var(--card-bg, #fbfaf6)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: 12,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <strong style={{ fontSize: 13, color: 'var(--ink)' }}>{req.investorName}</strong>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {new Date(req.createdAt).toLocaleDateString()}
                </span>
              </div>
              <a href={`mailto:${req.investorEmail}`} style={{ fontSize: 12, color: 'var(--forest)' }}>
                {req.investorEmail}
              </a>
              <p style={{ fontSize: 13, marginTop: 6, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
                {req.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ConnectionForm({ startupId, onSubmit }) {
  const [values, setValues] = useState({ investorName: '', investorEmail: '', message: '' });
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      await onSubmit(startupId, values);
      setSent(true);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSending(false);
    }
  }

  if (sent) return <div className="request-success" role="status"><span aria-hidden="true">✓</span><div><strong>Request sent</strong><p>Your introduction request has been recorded.</p></div></div>;

  return (
    <form className="connection-form" onSubmit={submit}>
      <p className="eyebrow">START A CONVERSATION</p>
      <h3>Request an introduction</h3>
      <label>Your name<input name="investorName" value={values.investorName} onChange={update} minLength="2" maxLength="100" required /></label>
      <label>Email address<input name="investorEmail" type="email" value={values.investorEmail} onChange={update} maxLength="254" required /></label>
      <label>Message<textarea name="message" value={values.message} onChange={update} minLength="20" maxLength="2000" rows="3" required placeholder="Tell the founders why you would like to connect." /></label>
      <p className="privacy-note">Your contact details are shared with the StartupMeu service to deliver this request.</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="button primary-button" disabled={sending}>{sending ? 'Sending…' : 'Send request'}</button>
    </form>
  );
}

export default function StartupProfile({ startup, currentUser, onClose, onRequest }) {
  const currentUserId = currentUser?.id || currentUser?._id;
  const isOwner = Boolean(
    currentUserId &&
    startup.owner &&
    (String(startup.owner) === String(currentUserId) || String(startup.owner._id || '') === String(currentUserId))
  );

  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="profile-dialog" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <button className="close-button profile-close" type="button" aria-label="Close profile" onClick={onClose}>×</button>
        <div className="profile-main">
          <p className="eyebrow">STARTUP PROFILE</p>
          <div className="profile-tags"><span>{startup.industry}</span><span>{startup.stage}</span></div>
          <h2 id="profile-title">{startup.name}</h2>
          {startup.tagline && <p className="profile-tagline">{startup.tagline}</p>}
          <div className="profile-meta"><span><small>LOCATION</small>{startup.location}</span><span><small>FUNDING SOUGHT</small>{formatAmount(startup.fundingRequired)} <em>amount, currency unspecified</em></span></div>
          <div className="profile-description"><h3>About</h3><p>{startup.description}</p></div>
          <p className="profile-disclaimer">Information in this profile is supplied by its creator and has not been independently verified.</p>
        </div>
        {isOwner ? (
          <ConnectionRequestsList startupId={startup._id} />
        ) : (
          <ConnectionForm startupId={startup._id} onSubmit={onRequest} />
        )}
      </section>
    </div>
  );
}
