# Portfolio website

This folder is a standalone static version of the portfolio, ready for GitHub Pages.

## Included pages

- `index.html`: scrolling home page with About, Projects, Resume summary, and Contact.
- `about.html`: introduction and automatically rotating photo stack.
- `projects.html`: project overview linking to four case studies.
- `resume.html`: the full resume.
- `commencium.html`, `teddy.html`, `metuvation.html`, `fintech.html`: project case studies.

All required images, fonts, styles, and scripts are included. The shared navigation is About / Projects / Resume / Contact. Contact asks for confirmation before opening Gmail's compose screen; it does not send an email.

## Publish with GitHub Pages

1. Create a new GitHub repository and upload the contents of this folder (not the folder itself).
2. In the repository, open **Settings → Pages**.
3. Set **Source** to **Deploy from a branch**, select `main` and the `/(root)` folder, then save.
4. GitHub will provide the public website URL after deployment completes.

The site uses only static HTML, CSS, JavaScript, fonts, and local assets; no build command is needed.

Keep the `assets` directory structure and `.nojekyll` file when uploading. Local QA screenshots, design references, exports, and development scripts are not part of this deployment folder.
