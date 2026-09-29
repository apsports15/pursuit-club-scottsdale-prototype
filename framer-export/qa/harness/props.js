// Component props for the harness, from the query string (shared by the client and SSR builds).
export function harnessProps(q) {
  return {
    assetBase: q.get('assetBase') != null ? q.get('assetBase') : 'http://localhost:8765/public/media/club-scottsdale/',
    applyUrl: q.get('apply') || 'https://apply.thepursuitpath.com/',
    hideSiteHeader: q.get('hide') !== '0',
    headerSelector: q.get('sel') || '',
    videoFormat: q.get('video') || 'auto',
  };
}
