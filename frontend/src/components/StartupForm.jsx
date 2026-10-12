import { useState } from 'react';

const stages = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B+', 'Growth'];

export default function StartupForm({ startup, onClose, onSave }) {
  const [values, setValues] = useState({
    name: startup?.name || '',
    tagline: startup?.tagline || '',
    description: startup?.description || '',
    industry: startup?.industry || '',
    stage: startup?.stage || 'Idea',
    location: startup?.location || '',
    fundingRequired: startup?.fundingRequired ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave({ ...values, fundingRequired: Number(values.fundingRequired) });
      onClose();
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="overlay" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="dialog" role="dialog" aria-modal="true" aria-labelledby="startup-form-title">
        <div className="dialog-head">
          <div><p className="eyebrow">FOUNDER SPACE</p><h2 id="startup-form-title">{startup ? 'Edit your profile' : 'Introduce your startup'}</h2></div>
          <button className="close-button" type="button" aria-label="Close form" onClick={onClose}>×</button>
        </div>
        <form onSubmit={submit} className="profile-form">
          <label>Startup name<input name="name" value={values.name} onChange={update} maxLength="100" required /></label>
          <label>One-line introduction <span className="optional">Optional</span><input name="tagline" value={values.tagline} onChange={update} maxLength="180" /></label>
          <label>About the startup<textarea name="description" value={values.description} onChange={update} minLength="20" maxLength="3000" rows="4" required /></label>
          <div className="form-grid">
            <label>Industry<input name="industry" value={values.industry} onChange={update} maxLength="80" required /></label>
            <label>Funding stage<select name="stage" value={values.stage} onChange={update}>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
            <label>Location<input name="location" value={values.location} onChange={update} maxLength="120" required /></label>
            <label>Funding sought <input name="fundingRequired" type="number" min="0" step="any" value={values.fundingRequired} onChange={update} required /></label>
          </div>
          <p className="form-note">Enter the funding amount as a number. This profile does not specify a currency.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="dialog-actions"><button className="button secondary-button" type="button" onClick={onClose}>Cancel</button><button className="button primary-button" disabled={saving}>{saving ? 'Saving…' : startup ? 'Save profile' : 'Publish profile'}</button></div>
        </form>
      </section>
    </div>
  );
}
