import { useCallback, useEffect, useState } from 'react';
import { createConnectionRequest, getStartup, listStartups, removeStartup, saveStartup } from './api';
import StartupCard from './components/StartupCard';
import StartupForm from './components/StartupForm';
import StartupProfile from './components/StartupProfile';

const stages = ['Idea', 'Pre-seed', 'Seed', 'Series A', 'Series B+', 'Growth'];

export default function App() {
  const [startups, setStartups] = useState([]);
  const [filters, setFilters] = useState({ search: '', industry: '', stage: '', location: '', minFunding: '' });
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingStartup, setEditingStartup] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');

  const refresh = useCallback(async (signal) => {
    setLoading(true);
    setError('');
    try {
      const result = await listStartups(filters, signal);
      setStartups(result.data || []);
    } catch (requestError) {
      if (requestError.name !== 'AbortError') setError(requestError.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  function updateFilter(event) {
    setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  function submitSearch(event) {
    event.preventDefault();
    setFilters((current) => ({ ...current, search: searchText.trim() }));
  }

  function clearFilters() {
    setSearchText('');
    setFilters({ search: '', industry: '', stage: '', location: '', minFunding: '' });
  }

  async function openProfile(id) {
    setProfile(null);
    setProfileError('');
    setProfileLoading(true);
    try {
      const result = await getStartup(id);
      setProfile(result.data);
    } catch (requestError) {
      setProfileError(requestError.message);
    } finally {
      setProfileLoading(false);
    }
  }

  function openCreate() {
    setEditingStartup(null);
    setFormOpen(true);
  }

  function openEdit(startup) {
    setEditingStartup(startup);
    setFormOpen(true);
  }

  async function handleSave(values) {
    const editing = Boolean(editingStartup);
    await saveStartup(editingStartup, values);
    setNotice(editing ? 'Startup profile updated.' : 'Startup profile published.');
    await refresh();
  }

  async function handleDelete(startup) {
    if (!window.confirm(`Delete the profile for ${startup.name}? Associated connection requests will also be removed.`)) return;
    setError('');
    setNotice('');
    try {
      await removeStartup(startup._id);
      setNotice('Startup profile deleted.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function handleConnectionRequest(id, values) {
    await createConnectionRequest(id, values);
  }

  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <div className="site-shell">
      <header className="site-header">
        <a className="wordmark" href="#home" aria-label="StartupMeu home">
          <span className="wordmark-symbol" aria-hidden="true"><i /><i /><i /></span><span>StartupMeu</span>
        </a>
        <nav className="site-nav" aria-label="Main navigation"><a className="nav-current" href="#discover">Discover</a><a href="#how-it-works">How it works</a></nav>
        <button className="button button-dark header-action" type="button" onClick={openCreate}>List a startup <span aria-hidden="true">↗</span></button>
      </header>

      <main id="home">
        <section className="intro-section" aria-labelledby="intro-title">
          <div className="intro-copy">
            <p className="eyebrow"><span className="eyebrow-rule" /> A place to meet what’s next</p>
            <h1 id="intro-title">Good ideas deserve<br /><em>the right connections.</em></h1>
            <p className="intro-description">Explore startups seeking funding. Learn what they’re building, where they are, and how to start a conversation.</p>
          </div>
          <div className="intro-aside" aria-hidden="true">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" /><span className="orbit-point point-one" /><span className="orbit-point point-two" /><span className="orbit-point point-three" />
            <div className="aside-note"><span>STARTUPMEU CONNECT</span><strong>Ideas meet<br />opportunity.</strong></div>
          </div>
        </section>

        <section className="discovery-section" id="discover" aria-labelledby="discover-title">
          <div className="section-heading">
            <div><p className="eyebrow">THE DIRECTORY</p><h2 id="discover-title">Discover startups</h2></div>
            <p className="section-note">Profiles are shared by their creators and have not been independently verified.</p>
          </div>

          <form className="search-panel" onSubmit={submitSearch}>
            <label className="search-field"><span aria-hidden="true">⌕</span><span className="sr-only">Search startups</span><input value={searchText} onChange={(event) => setSearchText(event.target.value)} placeholder="Search names, ideas, industries…" /></label>
            <div className="filter-fields">
              <label><span>Industry</span><input name="industry" value={filters.industry} onChange={updateFilter} placeholder="Any industry" /></label>
              <label><span>Stage</span><select name="stage" value={filters.stage} onChange={updateFilter}><option value="">All stages</option>{stages.map((stage) => <option key={stage}>{stage}</option>)}</select></label>
              <label><span>Location</span><input name="location" value={filters.location} onChange={updateFilter} placeholder="Any location" /></label>
              <label><span>Minimum ask</span><input name="minFunding" type="number" min="0" step="any" value={filters.minFunding} onChange={updateFilter} placeholder="No minimum" /></label>
            </div>
            <div className="search-actions"><button className="button button-dark" type="submit">Search startups <span aria-hidden="true">→</span></button>{hasFilters && <button className="clear-button" type="button" onClick={clearFilters}>Clear filters</button>}</div>
            <p className="currency-note">Funding amounts are shown as entered; profiles do not specify a currency.</p>
          </form>

          <div className="results-heading"><h3>{loading ? 'Startup profiles' : `${startups.length} ${startups.length === 1 ? 'profile' : 'profiles'}`}</h3><span>Shared by founders</span></div>
          {notice && <div className="notice-banner" role="status"><span aria-hidden="true">✓</span>{notice}<button type="button" onClick={() => setNotice('')} aria-label="Dismiss message">×</button></div>}
          {error && <div className="error-banner" role="alert"><span>{error}</span><button type="button" onClick={() => refresh()}>Try again</button></div>}
          {loading ? <div className="loading-state" role="status"><span className="spinner" /><span>Loading startup profiles…</span></div> : startups.length === 0 ? (
            <div className="empty-state">
              <span className="empty-mark" aria-hidden="true"><i /><i /></span>
              <p className="eyebrow">A NEW BEGINNING</p>
              <h3>{error ? 'Profiles are unavailable right now.' : hasFilters ? 'No profiles match those filters.' : 'The directory is ready for its first profile.'}</h3>
              <p>{error ? 'Check the connection and try again.' : hasFilters ? 'Try broadening your search, or clear the filters to see every profile.' : 'If you’re building a startup, introduce it to the community.'}</p>
              {hasFilters ? <button className="button button-outline" type="button" onClick={clearFilters}>Clear filters</button> : !error && <button className="button button-dark" type="button" onClick={openCreate}>List the first startup <span aria-hidden="true">↗</span></button>}
            </div>
          ) : (
            <div className="startup-grid">{startups.map((startup) => <StartupCard key={startup._id} startup={startup} onOpen={openProfile} onEdit={openEdit} onDelete={handleDelete} />)}</div>
          )}
        </section>

        <section className="how-section" id="how-it-works">
          <p className="eyebrow">A SIMPLE FIRST STEP</p>
          <div><h2>Make room for a conversation.</h2><p>Founders can share a profile. Potential investors can read about the opportunity and send a direct introduction request.</p></div>
          <button className="text-link" type="button" onClick={openCreate}>Introduce your startup <span aria-hidden="true">↗</span></button>
        </section>
      </main>

      <footer className="site-footer"><a className="wordmark footer-wordmark" href="#home"><span className="wordmark-symbol" aria-hidden="true"><i /><i /><i /></span><span>StartupMeu</span></a><span>Profiles are provided by their creators. Please do your own due diligence.</span><a href="#home">Back to top ↑</a></footer>

      {formOpen && <StartupForm startup={editingStartup} onClose={() => setFormOpen(false)} onSave={handleSave} />}
      {profileLoading && <div className="overlay" role="presentation"><section className="loading-dialog" role="status"><span className="spinner" />Loading startup profile…</section></div>}
      {profileError && <div className="overlay" role="presentation"><section className="loading-dialog" role="alert"><p>{profileError}</p><button className="button button-outline" type="button" onClick={() => setProfileError('')}>Close</button></section></div>}
      {profile && <StartupProfile startup={profile} onClose={() => setProfile(null)} onRequest={handleConnectionRequest} />}
    </div>
  );
}
