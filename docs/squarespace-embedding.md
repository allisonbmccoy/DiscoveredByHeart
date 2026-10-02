# Embed Discovered by Heart in Squarespace

After merging the accompanying changes and waiting for GitHub Pages to deploy:

1. Create a Squarespace page, for example `/discovered-by-heart`.
2. Use a full-width section with minimal section padding. The app supplies internal spacing.
3. Add a Code Block in HTML mode with Display Source disabled and paste the contents of [squarespace-embed.html](squarespace-embed.html).
4. Check the published page on desktop and mobile. Script execution may differ in the Squarespace editor; use a plan that supports JavaScript in Code Blocks.

Squarespace supplies its live header and footer. The app's `?embed=1` (or `?embed=true`) mode hides its minimal standalone shell but keeps the resource introduction and research finder.

Automatic sizing uses the app content wrapper, so the frame can shrink after filtering as well as grow when details open. Messages validate the sending window and origin. Only `https://www.sistersbyheart.org` and `https://sistersbyheart.org` are allowed parents; add any future production domain to `embed.js` before using it. Other hosts retain the initial 1200px iframe height and browser scrolling.

The iframe delegates geolocation for Find studies near me; visitors still decide whether to grant browser permission. Official study links open in a new tab.

Standalone mode retains the SBH logo, a main-site link and Donate button, with a compact attribution footer. It no longer duplicates the main site's menus, contact details or social links.
