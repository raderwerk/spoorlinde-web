export function filterAndSort(reizen, filters) {
  const result = reizen.filter((reis) =>
    (!filters.maand || reis.maanden.includes(filters.maand)) &&
    (!filters.duur || reis.duur === Number(filters.duur)) &&
    (!filters.land || reis.land === filters.land)
  );

  return result.sort((a, b) => filters.sortering === "prijs"
    ? a.prijs - b.prijs
    : a.datum.localeCompare(b.datum));
}

export function nearestAlternatives(reizen, filters, limit = 3) {
  return reizen
    .map((reis) => ({
      ...reis,
      afstand: Number(Boolean(filters.maand) && !reis.maanden.includes(filters.maand)) +
        Number(Boolean(filters.duur) && reis.duur !== Number(filters.duur)) +
        Number(Boolean(filters.land) && reis.land !== filters.land),
    }))
    .sort((a, b) => a.afstand - b.afstand || a.datum.localeCompare(b.datum))
    .slice(0, limit);
}

function init() {
  const formulier = document.querySelector("[data-filters]");
  if (!formulier) return;
  const kaarten = [...document.querySelectorAll("[data-reis]")];
  const reizen = kaarten.map((kaart) => ({
    element: kaart,
    maanden: kaart.dataset.maanden.split(","),
    duur: Number(kaart.dataset.duur),
    land: kaart.dataset.land,
    prijs: Number(kaart.dataset.prijs),
    datum: kaart.dataset.datum,
  }));
  const aantal = document.querySelector("[data-aantal]");
  const leeg = document.querySelector("[data-leeg]");
  const lijst = document.querySelector("[data-resultaten]");

  function toonResultaten() {
    const start = performance.now();
    const params = new URLSearchParams(new FormData(formulier));
    for (const [sleutel, waarde] of [...params]) if (!waarde) params.delete(sleutel);
    const filters = Object.fromEntries(params);
    const resultaten = filterAndSort(reizen, filters);
    const zichtbaar = resultaten.length ? resultaten : nearestAlternatives(reizen, filters);
    kaarten.forEach((kaart) => kaart.hidden = true);
    zichtbaar.forEach((reis) => {
      reis.element.hidden = false;
      lijst.append(reis.element);
    });
    leeg.hidden = resultaten.length > 0;
    aantal.textContent = resultaten.length
      ? `${resultaten.length} ${resultaten.length === 1 ? "reis" : "reizen"} gevonden`
      : "Geen exacte reizen gevonden";
    history.replaceState({}, "", `${location.pathname}${params.size ? `?${params}` : ""}`);
    console.info(`[Spoorlinde] Filters bijgewerkt in ${(performance.now() - start).toFixed(1)} ms`);
  }

  const params = new URLSearchParams(location.search);
  for (const element of formulier.elements) {
    if (element.name && params.has(element.name)) element.value = params.get(element.name);
  }
  formulier.addEventListener("change", toonResultaten);
  formulier.addEventListener("reset", () => setTimeout(toonResultaten));
  toonResultaten();
}

if (typeof document !== "undefined") init();
