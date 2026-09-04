# Single Ventricle Clinical Trial Finder

A lightweight, family-facing website that retrieves open single ventricle studies
directly from the ClinicalTrials.gov API v2.

## What it does

- Uses the Sisters by Heart single ventricle Expert Search expression.
- Shows only studies with overall status:
  - RECRUITING
  - NOT_YET_RECRUITING
- Lets families filter the returned studies by:
  - keyword
  - age group
  - recruitment status
  - state/region
- Links every result to the official ClinicalTrials.gov study page.
- Displays the ClinicalTrials.gov data refresh date when available.

## Files

- `index.html` — page structure and family-facing text
- `styles.css` — responsive design
- `app.js` — ClinicalTrials.gov API call, search query, filtering, and rendering

## Easiest way to publish

This is a static site. You can upload these three files to:

- GitHub Pages
- Netlify
- Cloudflare Pages
- a standard web server
- a subdirectory of an existing website

No database or server-side application is required.

## WordPress

If Sisters by Heart uses WordPress, the cleanest production approach is usually to
host this as a small standalone page or child-theme/template component rather than
pasting all JavaScript into the visual editor.

## Changing the search

Open `app.js` and edit the `SEARCH_QUERY` constant near the top.

## Important

ClinicalTrials.gov determines the data returned. This site should not imply that a
listed person is eligible for a study. The official study record and study team
remain authoritative.

## API

The site uses:

- `https://clinicaltrials.gov/api/v2/studies`
- `https://clinicaltrials.gov/api/v2/version`

ClinicalTrials.gov documentation:
https://clinicaltrials.gov/data-about-studies/learn-about-api
