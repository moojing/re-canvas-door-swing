export function destination(anchor, event, current, buildVersion) {
  if (!anchor || event.defaultPrevented || (event.button ?? 0) !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || anchor.hasAttribute('download')) return null;
  const url = new URL(anchor.href, current);
  const page = new URL(current);
  if (!['http:', 'https:'].includes(url.protocol) || url.origin !== page.origin || !/\.html?$/i.test(url.pathname)) return null;
  if (buildVersion) {
    url.searchParams.delete('door-demo-version');
    page.searchParams.delete('door-demo-version');
  }
  if (url.pathname === page.pathname && url.search === page.search) return null;
  if (buildVersion) url.searchParams.set('door-demo-version', buildVersion);
  return url.href;
}
export function choosePreset(ids, previous, random = Math.random) {
  const available = ids.filter(id => id !== previous);
  const pool = available.length ? available : ids;
  return pool[Math.floor(random() * pool.length)];
}
