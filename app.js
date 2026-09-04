// ============================================================
// Sisters by Heart: Discovered by Heart
// ClinicalTrials.gov API v2
//
// Edit SEARCH_QUERY below to change the underlying study search.
// ============================================================

const API_BASE = "https://clinicaltrials.gov/api/v2/studies";
const VERSION_URL = "https://clinicaltrials.gov/api/v2/version";

const SEARCH_QUERY = `
(
  AREA[ConditionSearch](
    "single ventricle"
    OR "functional single ventricle"
    OR "single ventricle physiology"
    OR "univentricular heart"
    OR "univentricular circulation"
    OR "hypoplastic left heart syndrome"
    OR HLHS
    OR "tricuspid atresia"
    OR "double inlet left ventricle"
    OR "double inlet ventricle"
    OR "mitral atresia"
    OR "unbalanced atrioventricular septal defect"
    OR "unbalanced atrioventricular canal"
    OR "pulmonary atresia with intact ventricular septum"
    OR PAIVS
    OR "Fontan circulation"
    OR "Fontan physiology"
    OR "Fontan palliation"
  )
  OR
  AREA[PatientSearch](
    "single ventricle palliation"
    OR "Norwood procedure"
    OR "Stage I Norwood"
    OR "bidirectional Glenn"
    OR "bidirectional cavopulmonary connection"
    OR "bidirectional cavopulmonary anastomosis"
    OR "Fontan procedure"
    OR "Fontan operation"
  )
)
AND
AREA[OverallStatus](
  RECRUITING
  OR NOT_YET_RECRUITING
)
`.replace(/\s+/g, " ").trim();

let allStudies = [];

const els = {
  results: document.querySelector("#results"),
  loading: document.querySelector("#loading"),
  error: document.querySelector("#error"),
  count: document.querySelector("#result-count"),
  dataDate: document.querySelector("#data-date"),
  text: document.querySelector("#text-filter"),
  age: document.querySelector("#age-filter"),
  status: document.querySelector("#status-filter"),
  state: document.querySelector("#state-filter"),
  clear: document.querySelector("#clear-filters"),
  refresh: document.querySelector("#refresh-button"),
  expertLink: document.querySelector("#expert-search-link"),
  template: document.querySelector("#study-template"),
};

function expertSearchUrl() {
  return `https://clinicaltrials.gov/expert-search?term=${encodeURIComponent(SEARCH_QUERY)}`;
}

function apiUrl() {
  const params = new URLSearchParams({
    "query.term": SEARCH_QUERY,
    pageSize: "1000",
    format: "json",
  });
  return `${API_BASE}?${params.toString()}`;
}

function cleanText(value) {
  if (!value) return "";
  return String(value)
    .replace(/[#*_>`~]/g, "")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(value, max = 430) {
  const text = cleanText(value);
  if (text.length <= max) return text;
  const sliced = text.slice(0, max);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${sliced.slice(0, lastSpace > 0 ? lastSpace : max)}…`;
}

function humanizeEnum(value) {
  if (!value) return "Not listed";
  return String(value)
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusLabel(status) {
  if (status === "RECRUITING") return "Recruiting now";
  if (status === "NOT_YET_RECRUITING") return "Opening soon";
  return humanizeEnum(status);
}

function getModule(study, moduleName) {
  return study?.protocolSection?.[moduleName] || {};
}

function normalizeStudy(study) {
  const id = getModule(study, "identificationModule");
  const status = getModule(study, "statusModule");
  const desc = getModule(study, "descriptionModule");
  const cond = getModule(study, "conditionsModule");
  const elig = getModule(study, "eligibilityModule");
  const design = getModule(study, "designModule");
  const arms = getModule(study, "armsInterventionsModule");
  const contacts = getModule(study, "contactsLocationsModule");
  const sponsor = getModule(study, "sponsorCollaboratorsModule");

  const locations = Array.isArray(contacts.locations) ? contacts.locations.filter(Boolean) : [];
  const states = [...new Set(
    locations
      .map((loc) => loc.state || loc.country)
      .filter(Boolean)
  )].sort();

  const searchable = [
    id.nctId,
    id.briefTitle,
    id.officialTitle,
    desc.briefSummary,
    ...(cond.conditions || []),
    ...(cond.keywords || []),
    ...locations.flatMap((l) => [l.facility, l.city, l.state, l.country]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    raw: study,
    nctId: id.nctId || "",
    title: id.briefTitle || id.officialTitle || "Untitled study",
    status: status.overallStatus || "",
    summary: desc.briefSummary || "A brief study summary is not available.",
    conditions: Array.isArray(cond.conditions) ? cond.conditions.filter(Boolean) : [],
    ages: Array.isArray(elig.stdAges) ? elig.stdAges.filter(Boolean) : [],
    sex: elig.sex || "ALL",
    studyType: design.studyType || "",
    primaryPurpose: design.designInfo?.primaryPurpose || "",
    phases: Array.isArray(design.phases) ? design.phases.filter(Boolean) : [],
    interventions: Array.isArray(arms.interventions) ? arms.interventions.filter(Boolean) : [],
    minAge: elig.minimumAge || "",
    maxAge: elig.maximumAge || "",
    healthyVolunteers: elig.healthyVolunteers,
    enrollment: design.enrollmentInfo?.count ?? null,
    sponsor: sponsor.leadSponsor?.name || "Not listed",
    locations,
    states,
    searchable,
  };
}


function friendlyList(items, max = 3) {
  const clean = [...new Set((items || []).map(cleanText).filter(Boolean))];
  if (!clean.length) return "";
  if (clean.length <= max) return clean.join(", ");
  return `${clean.slice(0, max).join(", ")}, and other related conditions`;
}

function ageRangeText(study) {
  const min = cleanText(study.minAge);
  const max = cleanText(study.maxAge);
  if (min && max) return `people ages ${min} to ${max}`;
  if (min) return `people age ${min} and older`;
  if (max) return `people up to age ${max}`;
  if (study.ages.length) return study.ages.map(humanizeEnum).join(" and ").toLowerCase();
  return "people who meet the study's eligibility requirements";
}

function interventionText(study) {
  const names = study.interventions.map((i) => cleanText(i.name)).filter(Boolean);
  if (names.length) return friendlyList(names, 3);
  if (study.studyType === "OBSERVATIONAL") return "Researchers are observing health information and outcomes rather than assigning a study treatment.";
  return "The specific intervention or approach is described in the official study record.";
}

function plainLanguageSummary(study) {
  const condition = friendlyList(study.conditions, 2);
  const interventionNames = study.interventions.map((i) => cleanText(i.name)).filter(Boolean);
  const purpose = study.primaryPurpose ? humanizeEnum(study.primaryPurpose).toLowerCase() : "";

  if (study.studyType === "OBSERVATIONAL") {
    return condition
      ? `Researchers are collecting information about people with ${condition} to learn more about their health, care, or outcomes over time. No study treatment is assigned as part of this observational study.`
      : `Researchers are collecting health information to learn more about care and outcomes over time. No study treatment is assigned as part of this observational study.`;
  }

  if (interventionNames.length) {
    const what = friendlyList(interventionNames, 2);
    if (condition && purpose) return `Researchers are studying ${what} in people with ${condition}. The main purpose of the study is ${purpose}.`;
    if (condition) return `Researchers are studying ${what} in people with ${condition} to learn more about its effects.`;
    return `Researchers are studying ${what} to learn more about its effects.`;
  }

  if (condition) return `Researchers are studying people with ${condition} to answer questions about their health, treatment, or care.`;
  return `Researchers are conducting this study to answer questions about health, treatment, or care in people who meet the study criteria.`;
}

function whoMightFit(study) {
  const age = ageRangeText(study);
  const conditions = friendlyList(study.conditions, 2);
  if (conditions) return `${age} with ${conditions}. Other eligibility requirements also apply.`;
  return `${age}. Other eligibility requirements also apply.`;
}

function locationText(study) {
  const recruitingLocations = study.locations.filter(
    (loc) => !loc.status || loc.status === "RECRUITING" || loc.status === "NOT_YET_RECRUITING"
  );
  const locations = recruitingLocations.length ? recruitingLocations : study.locations;

  if (!locations.length) return "No site locations are listed yet.";

  const labels = [...new Set(
    locations.map((loc) => {
      const parts = [loc.city, loc.state || loc.country].filter(Boolean);
      return parts.join(", ");
    }).filter(Boolean)
  )];

  if (!labels.length) return `${locations.length} location${locations.length === 1 ? "" : "s"} listed`;
  if (labels.length <= 4) return labels.join(" • ");
  return `${labels.slice(0, 4).join(" • ")} • +${labels.length - 4} more`;
}

function populateStateFilter() {
  const current = els.state.value;
  const values = [...new Set(allStudies.flatMap((s) => s.states))].sort();

  els.state.innerHTML = '<option value="">Any location</option>';
  values.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    els.state.append(option);
  });

  if (values.includes(current)) els.state.value = current;
}

function filteredStudies() {
  const text = els.text.value.trim().toLowerCase();
  const age = els.age.value;
  const status = els.status.value;
  const state = els.state.value;

  return allStudies.filter((study) => {
    const textOk = !text || study.searchable.includes(text);
    const ageOk = !age || study.ages.includes(age);
    const statusOk = !status || study.status === status;
    const stateOk = !state || study.states.includes(state);
    return textOk && ageOk && statusOk && stateOk;
  });
}

function render() {
  const studies = filteredStudies();
  els.results.innerHTML = "";

  els.count.textContent =
    studies.length === allStudies.length
      ? `${studies.length} open stud${studies.length === 1 ? "y" : "ies"}`
      : `${studies.length} of ${allStudies.length} studies`;

  if (!studies.length) {
    const empty = document.createElement("div");
    empty.className = "empty-card";
    empty.innerHTML = `
      <div>
        <strong>No studies match these filters.</strong>
        <p>Try clearing one or more filters, or open the full search on ClinicalTrials.gov.</p>
      </div>`;
    els.results.append(empty);
    return;
  }

  studies.forEach((study) => {
    try {
      const fragment = els.template.content.cloneNode(true);

      const badge = fragment.querySelector(".status-badge");
      badge.textContent = statusLabel(study.status);
      badge.classList.add(study.status === "RECRUITING" ? "recruiting" : "soon");

      fragment.querySelector(".nct-id").textContent = study.nctId || "ClinicalTrials.gov study";
      fragment.querySelector(".study-title").textContent = study.title;

      fragment.querySelector(".ages").textContent =
        study.ages.length ? study.ages.map(humanizeEnum).join(" · ") : "Age not listed";

      fragment.querySelector(".study-type").textContent =
        study.studyType ? humanizeEnum(study.studyType) : "Study type not listed";

      fragment.querySelector(".plain-summary").textContent = plainLanguageSummary(study);
      fragment.querySelector(".plain-who").textContent = whoMightFit(study);
      fragment.querySelector(".plain-what").textContent = interventionText(study);
      fragment.querySelector(".summary").textContent = cleanText(study.summary);

      const tags = fragment.querySelector(".condition-tags");
      const conditions = study.conditions.slice(0, 8);
      if (conditions.length) {
        conditions.forEach((condition) => {
          const span = document.createElement("span");
          span.textContent = condition;
          tags.append(span);
        });
      } else {
        const span = document.createElement("span");
        span.textContent = "Condition not listed";
        tags.append(span);
      }

      fragment.querySelector(".locations").textContent = locationText(study);

      const link = fragment.querySelector(".study-link");
      link.href = study.nctId
        ? `https://clinicaltrials.gov/study/${encodeURIComponent(study.nctId)}`
        : "https://clinicaltrials.gov/";

      const enrollmentNumber = Number(study.enrollment);
      fragment.querySelector(".enrollment").textContent =
        study.enrollment == null || Number.isNaN(enrollmentNumber)
          ? "Not listed"
          : enrollmentNumber.toLocaleString();

      fragment.querySelector(".sex").textContent =
        study.sex === "ALL" ? "All sexes" : humanizeEnum(study.sex);

      fragment.querySelector(".sponsor").textContent = study.sponsor;

      const toggle = fragment.querySelector(".details-toggle");
      const panel = fragment.querySelector(".details-panel");
      toggle.addEventListener("click", () => {
        const opening = panel.hidden;
        panel.hidden = !panel.hidden;
        toggle.textContent = opening ? "Hide details" : "More details";
      });

      els.results.append(fragment);
    } catch (cardError) {
      console.warn("Skipping a study that could not be displayed", study?.nctId, cardError);
    }
  });
}

async function loadVersion() {
  try {
    const response = await fetch(VERSION_URL);
    if (!response.ok) return;
    const data = await response.json();
    if (data.dataTimestamp) {
      const date = new Date(data.dataTimestamp);
      els.dataDate.textContent = `ClinicalTrials.gov data: ${date.toLocaleDateString()}`;
    }
  } catch (_) {
    // Nonessential; fail silently.
  }
}

async function loadStudies() {
  els.loading.hidden = false;
  els.error.hidden = true;
  els.results.innerHTML = "";
  els.count.textContent = "Loading studies…";

  try {
    const response = await fetch(apiUrl(), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`ClinicalTrials.gov returned ${response.status}`);
    }

    const data = await response.json();
    allStudies = (data.studies || []).map(normalizeStudy);

    // Put recruiting studies first, then sort alphabetically.
    allStudies.sort((a, b) => {
      if (a.status !== b.status) {
        if (a.status === "RECRUITING") return -1;
        if (b.status === "RECRUITING") return 1;
      }
      return a.title.localeCompare(b.title);
    });

    populateStateFilter();
    els.error.hidden = true;
    els.loading.hidden = true;
    render();

    if (allStudies.length && !els.results.children.length) {
      throw new Error("Studies were returned but could not be displayed.");
    }
  } catch (error) {
    console.error(error);
    els.loading.hidden = true;
    els.error.hidden = false;
    if (!allStudies.length) {
      els.count.textContent = "Studies unavailable";
    }
  } finally {
    els.loading.hidden = true;
  }
}

function clearFilters() {
  els.text.value = "";
  els.age.value = "";
  els.status.value = "";
  els.state.value = "";
  render();
}

[els.text, els.age, els.status, els.state].forEach((el) => {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});

els.clear.addEventListener("click", clearFilters);
els.refresh.addEventListener("click", () => {
  loadStudies();
  loadVersion();
});

els.expertLink.href = expertSearchUrl();

loadVersion();
loadStudies();
