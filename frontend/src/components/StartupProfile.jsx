import { useState } from 'react';

function formatAmount(value) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(value);
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

export default function StartupProfile({ startup, onClose, onRequest }) {
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
        <ConnectionForm startupId={startup._id} onSubmit={onRequest} />
      </section>
    </div>
  );
}
