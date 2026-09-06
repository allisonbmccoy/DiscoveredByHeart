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
- `data/curated-summaries.json` — optional manually curated Sisters by Heart summaries

## Easiest way to publish

This is a static site. Upload the site files and the `data` folder to:

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

## Adding a curated Sisters by Heart summary

Edit only `data/curated-summaries.json`. It starts as `{}` with no summaries.
Entries are keyed by the trial's exact NCT ID. Add or edit an entry, commit it,
and let GitHub Pages deploy; the next page load picks up the file. No changes
to `app.js` are needed.

Example structure only (placeholder ID and text, not a real study summary):

```json
{
  "NCT01234567": {
    "what_is_this_study_about": "[Add reviewed study overview here.]",
    "who_might_this_be_for": "[Add reviewed audience information here.]",
    "why_might_this_matter": "[Add reviewed significance here.]",
    "what_should_families_know": "[Add reviewed family considerations here.]",
    "reviewed_date": "2026-09-06"
  }
}
```

All five fields are optional. The four summary fields accept plain text and
display under question headings; HTML is displayed as text. Blank or non-text
fields are ignored. `reviewed_date` accepts a valid `YYYY-MM-DD` date and displays
as, for example, “Reviewed September 2026.” Invalid dates are omitted. An entry
needs at least one nonblank summary field to display a section.

Separate multiple NCT entries with commas; use double quotes and no trailing
commas or comments to keep the file valid JSON. Remove all entries by restoring `{}`.

ClinicalTrials.gov remains the source of which trials appear and what filters
match. Curated content supplements the official description, never replaces it,
and cannot add a trial to the results. Trials without summaries display normally
with no empty summary box. Missing, invalid, or unreachable JSON is silently
ignored. The file is fetched once per page load, independently of the live search;
the Refresh studies button continues to refresh the official data.

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
