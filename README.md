# WEBOMONKS — Digital Growth Studio

A cinematic, mobile-responsive digital marketing agency website inspired by the supplied Wafer interface, customized for WEBOMONKS.

## Live entry point
The deployed website loads from **`index.html`**, a standalone HTML document containing all required CSS and JavaScript. The legacy `styles.css`, `app.js` and `config.js` files remain in the repository for historical reference but are not used by the new homepage.

## Features
- Cinematic video splash screen and animated ASCII textures
- Enter-the-studio transition to an interactive agency dashboard
- Pointer-reactive rotating 3D particle sphere
- Expandable service details for Meta Ads, Google Ads, SEO, and Digital Marketing
- Sidebar navigation, responsive mobile layout, and service search
- Enquiry form that prepares an email in the visitor's email application

## Contact setup required
The site **does not send enquiries to WEBOMONKS yet**: a verified business email address has not been provided. Set `configuredEmail` in the inline JavaScript in `index.html` to an address that you own, or integrate a server-side form endpoint. Visitors must still confirm the email in their email application. Do not use sample addresses until ownership is verified.

## Deploy with GitHub Pages
Repository **Settings → Pages → Build and deployment → Deploy from a branch**. Select **main** and **/(root)**, then Save.

Expected URL: https://paulteam8168-png.github.io/webomonks/

The videos, poster images and Google Fonts are hosted externally and require internet access. Animations have fallbacks for reduced motion.

