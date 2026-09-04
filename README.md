# Discovered by Heart

**Explore research opportunities for the single ventricle community.**

Discovered by Heart is a family-facing Sisters by Heart resource that retrieves open single ventricle research studies directly from the ClinicalTrials.gov API v2.

## What it does

- Uses the Sisters by Heart single ventricle Expert Search expression.
- Shows studies with overall status `RECRUITING` or `NOT_YET_RECRUITING`.
- Lets families filter results by keyword, age group, recruitment status, and state/region.
- Links each result to the official ClinicalTrials.gov study record.
- Displays the ClinicalTrials.gov data refresh date when available.

## Files

- `index.html` - page structure and family-facing content
- `styles.css` - Sisters by Heart visual styling
- `app.js` - ClinicalTrials.gov query, filtering, and rendering
- `SBH_Logo_RGB_Pos.png` - Sisters by Heart logo

## Updating the search

The search expression is stored near the top of `app.js` in `SEARCH_QUERY`.

## Hosting

This is a static site and can be hosted with GitHub Pages or another static hosting service. No API key or database is required.
