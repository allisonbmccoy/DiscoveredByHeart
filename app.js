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
let userLocation = null;

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
  nearMe: document.querySelector("#near-me-button"),
  locationStatus: document.querySelector("#location-status"),
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
  const recruitingLocations = locations.filter(
    (location) => location.status === "RECRUITING" || location.status === "NOT_YET_RECRUITING"
  );
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
    desc.detailedDescription,
    elig.eligibilityCriteria,
    ...(cond.conditions || []),
    ...(cond.keywords || []),
    ...(arms.interventions || []).flatMap((intervention) => [intervention.name, intervention.description]),
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
    summary: desc.briefSummary || "",
    detailedDescription: desc.detailedDescription || "",
    eligibilityCriteria: elig.eligibilityCriteria || "",
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
    centralContacts: Array.isArray(contacts.centralContacts) ? contacts.centralContacts.filter(Boolean) : [],
    locations,
    recruitingLocations,
    states,
    lastUpdated: status.lastUpdatePostDateStruct?.date || status.lastUpdateSubmitDate || "",
    pathwayTags: pathwayTags([
      id.briefTitle,
      id.officialTitle,
      desc.briefSummary,
      desc.detailedDescription,
      elig.eligibilityCriteria,
      ...(cond.keywords || []),
      ...(arms.interventions || []).flatMap((intervention) => [
        intervention.name,
        intervention.description,
      ]),
    ]),
    searchable,
  };
}

function pathwayTags(values) {
  const text = (values || []).filter(Boolean).join(" ");
  const supportedTags = [
    ["Norwood", /\bnorwood\b/i],
    ["Interstage", /\binterstage\b/i],
    ["Glenn", /\bglenn\b/i],
    ["Fontan", /\bfontan\b/i],
  ];
  return supportedTags.filter(([, pattern]) => pattern.test(text)).map(([label]) => label);
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
  const summary = cleanText(study.summary);
  if (!summary) return "ClinicalTrials.gov does not provide a brief summary for this study.";

  // Keep the registry's meaning intact while making common purpose-style openings
  // read naturally as a complete, family-facing sentence.
  const purposeOpenings = [
    [/^to compare\b/i, "This study compares"],
    [/^to evaluate\b/i, "This study evaluates"],
    [/^to assess\b/i, "This study assesses"],
    [/^to determine\b/i, "This study aims to determine"],
    [/^to investigate\b/i, "This study investigates"],
    [/^to examine\b/i, "This study examines"],
    [/^to describe\b/i, "This study describes"],
  ];
  const opening = purposeOpenings.find(([pattern]) => pattern.test(summary));
  const familySummary = opening ? summary.replace(opening[0], opening[1]) : summary;
  return truncate(familySummary, 520);
}

function whoMightFit(study) {
  const age = ageRangeText(study);
  const relevantCriteria = eligibilityHighlights(study.eligibilityCriteria);
  const highlights = relevantCriteria.length ? ` Registry criteria also mention ${sentenceList(relevantCriteria)}.` : "";
  return `This study lists ${age}.${highlights} The study team determines eligibility; other requirements also apply.`;
}

function eligibilityHighlights(criteria) {
  const cleaned = String(criteria || "").replace(/\r/g, "").trim();
  if (!cleaned) return [];

  const inclusionOnly = cleaned
    .split(/^\s*exclusion criteria:?\s*$/im)[0]
    .replace(/^\s*inclusion criteria:?\s*$/gim, "");
  const relevant = /single[- ]ventricle|norwood|interstage|glenn|fontan|cardiac catheter/i;
  return [...new Set(
    inclusionOnly
      .split(/\n+|;\s+/)
      .map((line) => cleanText(line.replace(/^[-•*]+\s*/, "")).replace(/[.;]+$/, ""))
      .filter((line) => line && relevant.test(line))
  )].slice(0, 3);
}

function parseEligibilityCriteria(criteria) {
  const text = String(criteria || "").replace(/\r/g, "").trim();
  if (!text) return { inclusion: [], exclusion: [] };
  const sections = text.split(/^\s*exclusion criteria:?\s*$/im);
  return {
    inclusion: criteriaLines(sections[0].replace(/^\s*inclusion criteria:?\s*$/gim, "")),
    exclusion: criteriaLines(sections.slice(1).join("\n")),
  };
}

function criteriaLines(value) {
  return [...new Set(
    String(value || "")
      .split(/\n+/)
      .map((line) => cleanText(line.replace(/^[-•*]+\s*/, "")))
      .filter(Boolean)
  )];
}

function sentenceList(items) {
  const clean = [...new Set((items || []).map(cleanText).filter(Boolean))];
  if (clean.length < 2) return clean[0] || "";
  if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")}, and ${clean.at(-1)}`;
}

function phaseText(study) {
  if (!study.phases.length) return "Not listed";
  return study.phases.map((phase) => phase === "NA" ? "Not applicable" : humanizeEnum(phase)).join(" · ");
}

function formatRecordDate(value) {
  if (!value) return "Not listed";
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? cleanText(value)
    : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function locationText(study) {
  const locations = study.recruitingLocations.length ? study.recruitingLocations : study.locations;

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

function studyFormatText(study) {
  if (study.studyType === "INTERVENTIONAL") {
    return "Interventional — the study assigns an intervention, procedure, device, drug, or other approach.";
  }
  if (study.studyType === "OBSERVATIONAL") {
    return "Observational — researchers collect information or measurements without assigning the treatment being studied. Tests or visits may still be required.";
  }
  return study.studyType ? humanizeEnum(study.studyType) : "Study format is not listed.";
}

function radians(degrees) {
  return degrees * Math.PI / 180;
}

function distanceMiles(from, to) {
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 3958.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function locationCoordinates(location) {
  if (location?.geoPoint?.lat == null || location?.geoPoint?.lon == null) return null;
  const latitude = Number(location?.geoPoint?.lat);
  const longitude = Number(location?.geoPoint?.lon);
  return Number.isFinite(latitude) && Number.isFinite(longitude) ? { latitude, longitude } : null;
}

function nearestOpenLocation(study) {
  if (!userLocation) return null;
  return study.recruitingLocations
    .map((location) => {
      const coordinates = locationCoordinates(location);
      return coordinates ? { location, distance: distanceMiles(userLocation, coordinates) } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.distance - b.distance)[0] || null;
}

function locationLabel(location) {
  return [location?.facility, location?.city, location?.state || location?.country]
    .map(cleanText)
    .filter(Boolean)
    .join(" · ");
}

function contactForStudy(study) {
  const nearest = nearestOpenLocation(study);
  const selectedLocation = nearest?.location || study.recruitingLocations.find(
    (location) => els.state.value && (location.state === els.state.value || location.country === els.state.value)
  );
  const selectedContacts = selectedLocation && Array.isArray(selectedLocation.contacts)
    ? selectedLocation.contacts.filter(Boolean)
    : [];
  if (selectedContacts.length) return { contacts: selectedContacts, context: locationLabel(selectedLocation) };
  if (study.centralContacts.length) return { contacts: study.centralContacts, context: "Overall study contact" };
  const location = study.recruitingLocations.find((item) => Array.isArray(item.contacts) && item.contacts.length);
  return location ? { contacts: location.contacts.filter(Boolean), context: locationLabel(location) } : null;
}

function appendContactLink(container, label, value, href) {
  if (!value) return;
  const row = document.createElement("p");
  const strong = document.createElement("strong");
  const link = document.createElement("a");
  strong.textContent = `${label}: `;
  link.textContent = cleanText(value);
  link.href = href;
  row.append(strong, link);
  container.append(row);
}

function renderContactPanel(fragment, study) {
  const contactInfo = contactForStudy(study);
  const button = fragment.querySelector(".contact-toggle");
  const panel = fragment.querySelector(".contact-panel");
  if (!contactInfo?.contacts.length) {
    button.hidden = true;
    return;
  }
  fragment.querySelector(".contact-context").textContent = contactInfo.context;
  const contactList = fragment.querySelector(".contact-list");
  contactInfo.contacts.slice(0, 2).forEach((contact) => {
    const item = document.createElement("div");
    item.className = "contact-item";
    const name = document.createElement("strong");
    name.textContent = cleanText(contact.name) || "Study contact";
    item.append(name);
    appendContactLink(item, "Email", contact.email, `mailto:${contact.email || ""}`);
    appendContactLink(item, "Phone", contact.phone, `tel:${contact.phone || ""}`);
    contactList.append(item);
  });
  button.addEventListener("click", () => {
    const opening = panel.hidden;
    panel.hidden = !panel.hidden;
    button.textContent = opening ? "Hide study contact" : "Contact study team";
  });
}

function renderCriteria(fragment, study) {
  const criteria = parseEligibilityCriteria(study.eligibilityCriteria);
  const section = fragment.querySelector(".participation-section");
  if (!criteria.inclusion.length && !criteria.exclusion.length) {
    section.hidden = true;
    return;
  }
  [[".inclusion-list", criteria.inclusion], [".exclusion-list", criteria.exclusion]].forEach(([selector, items]) => {
    const list = fragment.querySelector(selector);
    if (!items.length) {
      list.parentElement.hidden = true;
      return;
    }
    const priorityTerms = /single[- ]ventricle|norwood|interstage|glenn|fontan|cardiac catheter/i;
    [...items]
      .sort((a, b) => Number(priorityTerms.test(b)) - Number(priorityTerms.test(a)))
      .slice(0, 4)
      .forEach((criterion) => {
      const li = document.createElement("li");
      li.textContent = criterion;
      list.append(li);
      });
  });
  fragment.querySelector(".healthy-volunteers").textContent = study.healthyVolunteers === true
    ? "Healthy volunteers are accepted."
    : study.healthyVolunteers === false
      ? "Healthy volunteers are not accepted."
      : "Healthy-volunteer eligibility is not listed.";
  fragment.querySelector(".full-eligibility").textContent = cleanText(study.eligibilityCriteria);
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

  const studies = allStudies.filter((study) => {
    const textOk = !text || study.searchable.includes(text);
    const ageOk = !age || study.ages.includes(age);
    const statusOk = !status || study.status === status;
    const stateOk = !state || study.states.includes(state);
    return textOk && ageOk && statusOk && stateOk;
  });
  if (userLocation) {
    studies.sort((a, b) => (nearestOpenLocation(a)?.distance ?? Infinity) - (nearestOpenLocation(b)?.distance ?? Infinity));
  }
  return studies;
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
      fragment.querySelector(".study-format").textContent = studyFormatText(study);

      fragment.querySelector(".plain-summary").textContent = plainLanguageSummary(study);
      fragment.querySelector(".plain-who").textContent = whoMightFit(study);
      fragment.querySelector(".plain-what").textContent = interventionText(study);
      fragment.querySelector(".official-brief-summary").textContent =
        cleanText(study.summary) || "A brief summary is not available.";
      const detailedDescription = fragment.querySelector(".official-detailed-description");
      const detailedDescriptionBlock = fragment.querySelector(".official-detailed-block");
      if (study.detailedDescription) {
        detailedDescription.textContent = cleanText(study.detailedDescription);
      } else {
        detailedDescriptionBlock.hidden = true;
      }

      const pathwayTagsContainer = fragment.querySelector(".pathway-tags");
      const pathwaySection = fragment.querySelector(".pathway-section");
      if (study.pathwayTags.length) {
        study.pathwayTags.forEach((tag) => {
          const span = document.createElement("span");
          span.textContent = tag;
          pathwayTagsContainer.append(span);
        });
      } else {
        pathwaySection.hidden = true;
      }

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
      const nearest = nearestOpenLocation(study);
      const nearestText = fragment.querySelector(".nearest-location");
      if (nearest) {
        nearestText.textContent = `Nearest open site: about ${Math.round(nearest.distance).toLocaleString()} miles · ${locationLabel(nearest.location)}`;
      } else {
        nearestText.hidden = true;
      }

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
      fragment.querySelector(".phase").textContent = phaseText(study);
      fragment.querySelector(".open-locations").textContent = study.recruitingLocations.length.toLocaleString();
      fragment.querySelector(".last-updated").textContent = formatRecordDate(study.lastUpdated);
      renderContactPanel(fragment, study);
      renderCriteria(fragment, study);

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
    render();

    if (allStudies.length && !els.results.children.length) {
      throw new Error("Studies were returned but could not be displayed.");
    }
    els.error.hidden = true;
    els.loading.hidden = true;
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
  userLocation = null;
  els.nearMe.textContent = "Find studies near me";
  els.locationStatus.textContent = "";
  render();
}

function findStudiesNearMe() {
  if (userLocation) {
    userLocation = null;
    els.nearMe.textContent = "Find studies near me";
    els.locationStatus.textContent = "Distance sorting cleared.";
    render();
    return;
  }
  if (!navigator.geolocation) {
    els.locationStatus.textContent = "Location services are not available in this browser.";
    return;
  }
  els.nearMe.disabled = true;
  els.locationStatus.textContent = "Requesting your approximate location…";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      userLocation = { latitude: coords.latitude, longitude: coords.longitude };
      els.nearMe.disabled = false;
      els.nearMe.textContent = "Clear distance sorting";
      els.locationStatus.textContent = "Studies are sorted by the nearest currently open site. Your location stays in this browser and is not saved.";
      render();
    },
    () => {
      els.nearMe.disabled = false;
      els.locationStatus.textContent = "We couldn't access your location. You can still use the state/region filter.";
    },
    { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
  );
}

[els.text, els.age, els.status, els.state].forEach((el) => {
  el.addEventListener("input", render);
  el.addEventListener("change", render);
});

els.clear.addEventListener("click", clearFilters);
els.nearMe.addEventListener("click", findStudiesNearMe);
els.refresh.addEventListener("click", () => {
  loadStudies();
  loadVersion();
});

els.expertLink.href = expertSearchUrl();

loadVersion();
loadStudies();
