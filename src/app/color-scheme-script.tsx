// Blocking inline script to apply the persisted color scheme before first paint,
// preventing a flash of the default theme on page load.
export function ColorSchemeScript() {
  const html = `
    try {
      var s = JSON.parse(localStorage.getItem('app-storage') || '{}');
      var c = s && s.state && s.state.colorScheme;
      if (c && c !== 'default') document.documentElement.setAttribute('data-theme', c);
    } catch(e) {}
  `;

  // biome-ignore lint/security/noDangerouslySetInnerHtml: must be inline to run before paint
  return <script dangerouslySetInnerHTML={{ __html: html }} />;
}
