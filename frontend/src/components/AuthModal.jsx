import { useState } from 'react';
import { loginUser, registerUser } from '../api';

export default function AuthModal({ initialMode = 'login', initialMessage = '', onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [values, setValues] = useState({
    name: '',
    email: '',
    password: '',
    role: 'founder',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(initialMessage);

  function update(event) {
    setValues((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError('');
  }

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setNotice('');

    try {
      if (mode === 'register') {
        if (values.name.trim().length < 2) {
          throw new Error('Name must be at least 2 characters.');
        }
        if (values.password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        const data = await registerUser({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          role: values.role,
        });
        onSuccess(data.user);
        onClose();
      } else {
        const data = await loginUser({
          email: values.email.trim(),
          password: values.password,
        });
        onSuccess(data.user);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="overlay"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="dialog auth-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-dialog-title"
      >
        <div className="dialog-head">
          <div>
            <p className="eyebrow">ACCOUNT ACCESS</p>
            <h2 id="auth-dialog-title">{mode === 'login' ? 'Sign in to StartupMeu' : 'Create an account'}</h2>
          </div>
          <button className="close-button" type="button" aria-label="Close dialog" onClick={onClose}>
            ×
          </button>
        </div>

        {notice && (
          <div className="notice-banner" role="status" style={{ marginBottom: 16 }}>
            <span aria-hidden="true">ℹ</span>
            <span>{notice}</span>
          </div>
        )}

        <div className="auth-mode-toggle" style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            className={`button ${mode === 'login' ? 'button-dark' : 'button-outline'}`}
            style={{ flex: 1 }}
            onClick={() => switchMode('login')}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`button ${mode === 'register' ? 'button-dark' : 'button-outline'}`}
            style={{ flex: 1 }}
            onClick={() => switchMode('register')}
          >
            Create account
          </button>
        </div>

        <form onSubmit={submit} className="profile-form">
          {mode === 'register' && (
            <>
              <label>
                Full name
                <input
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={update}
                  minLength="2"
                  maxLength="100"
                  required
                  placeholder="e.g. Maya Lin"
                />
              </label>
              <label>
                I am a
                <select name="role" value={values.role} onChange={update}>
                  <option value="founder">Founder (Listing startups)</option>
                  <option value="investor">Investor (Exploring opportunities)</option>
                </select>
              </label>
            </>
          )}

          <label>
            Email address
            <input
              name="email"
              type="email"
              value={values.email}
              onChange={update}
              maxLength="254"
              required
              placeholder="e.g. founder@startup.example"
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              value={values.password}
              onChange={update}
              minLength={mode === 'register' ? '8' : undefined}
              required
              placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter your password'}
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <div className="dialog-actions" style={{ marginTop: 16 }}>
            <button className="button secondary-button" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="button primary-button" disabled={submitting}>
              {submitting ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
