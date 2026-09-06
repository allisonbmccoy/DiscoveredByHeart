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
- `data/curated-summaries.json` - optional manually curated summaries
- `SBH_Logo_RGB_Pos.png` - Sisters by Heart logo

## Updating the search

The search expression is stored near the top of `app.js` in `SEARCH_QUERY`.

## Hosting

This is a static site and can be hosted with GitHub Pages or another static hosting service. No API key or database is required.

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

Studies with at least one usable curated summary field appear first. Within
the curated and non-curated groups, the existing recruitment/title order is
preserved, or distance order when “Find studies near me” is active. Empty,
malformed, or date-only entries do not affect sorting.
