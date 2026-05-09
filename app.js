"use strict";

/*
  Stato centrale del simulatore STF.
  Include valori economici, metadati per esclusione/lock e scenari salvati.
*/

const STORAGE_KEY = "stf_scenari_v2";

/*
  Stato iniziale dell'applicazione.
  Ogni blocco rappresenta un'area economica distinta e si può
  usare come base per nuovi scenari o come default del simulatore.
*/
const appState = {
  revenues: {
    postazioni_studio_mesi: 10,
    postazioni_studio_costo_mensile: 850,
    eventi_profit_prezzo_mezza: 300,
    eventi_profit_mezze_giornate: 8,
    eventi_non_profit_prezzo_mezza: 180,
    eventi_non_profit_mezze_giornate: 8,
    conferenze_numero_mezze_giornate: 6,
    conferenze_prezzo_unitario: 250,
    corsi_numero_corsi: 4,
    corsi_partecipanti_per_corso: 14,
    corsi_prezzo_a_persona: 45,
    corsi_costo_vivo_per_corso: 180
  },
  costsFixed: {
    acqua: 120,
    elettricita: 350,
    gas: 220,
    tari: 180,
    assicurazione: 130,
    pulizie_costo_orario: 18,
    pulizie_ore: 30
  },
  costsVariable: {
    eventi_risorse_costo_orario: 20,
    eventi_risorse_ore: 24,
    manutenzione_ordinaria: 200,
    consumabili_attrezzoteca: 160
  },
  operatorsFixed: [
    {
      id: Date.now(),
      nome: "Operatore 1",
      costo_orario: 20,
      ore: 80,
      excluded: false,
      locked: false
    }
  ],
  membership: {
    numero_iscritti: 120,
    lockEnabled: false,
    lockValue: 10,
    quotaMinimaAnnuale: 5
  },
  fieldMeta: {},
  scenarios: []
};

/*
  Orizzonti temporali usati per le proiezioni nel riepilogo.
  Se vuoi confronti più lunghi o più brevi, modifica questo array.
*/
const projectionHorizons = [1, 6, 12, 24, 36];

/*
  Schemi di rendering per tutte le righe configurabili.
  Ogni riga ha checkbox Escludi e checkbox Lock.

  ── LIMITI SLIDER ──────────────────────────────────────────────
  I valori max (e min) di ogni campo definiscono il range dello
  slider. Modificali qui per adattarli alle dimensioni del tuo
  spazio. I commenti su ogni max: spiegano la logica adottata.
  ───────────────────────────────────────────────────────────────
*/
const controlSchemas = [
  {
    mountId: "revenuesStudio",
    group: "revenues",
    fields: [
      {
        key: "postazioni_studio_mesi",
        label: "Postazioni Studio: postazioni occupate",
        min: 1,
        max: 20,    // max 20 postazioni: capienza realistica di un piccolo coworking
        step: 1,
        hasRange: true
      },
      {
        key: "postazioni_studio_costo_mensile",
        label: "Postazioni Studio: costo mensile",
        min: 0,
        max: 2000,  // €2.000/mese per postazione: soglia alta per coworking premium
        step: 10,
        hasRange: true
      }
    ]
  },
  {
    mountId: "revenuesEvents",
    group: "revenues",
    fields: [
      {
        key: "eventi_profit_prezzo_mezza",
        label: "Eventi Profit: prezzo per mezza giornata",
        min: 0,
        max: 1000,  // €1.000 per mezza giornata: affitto sala eventi con allestimento
        step: 10,
        hasRange: true
      },
      {
        key: "eventi_profit_mezze_giornate",
        label: "Eventi Profit: numero mezze giornate (al mese)",
        min: 1,
        max: 50,    // 50 mezze giornate/mese: ~2,5 eventi al giorno (massimo teorico)
        step: 1,
        hasRange: true
      },
      {
        key: "eventi_non_profit_prezzo_mezza",
        label: "Eventi Non Profit: prezzo per mezza giornata",
        min: 0,
        max: 500,   // €500: tariffa agevolata per enti non profit o comunita
        step: 10,
        hasRange: true
      },
      {
        key: "eventi_non_profit_mezze_giornate",
        label: "Eventi Non Profit: numero mezze giornate (al mese)",
        min: 1,
        max: 50,    // 50 mezze giornate/mese: stesso tetto degli eventi profit
        step: 1,
        hasRange: true
      }
    ]
  },
  {
    mountId: "revenuesConference",
    group: "revenues",
    fields: [
      {
        key: "conferenze_numero_mezze_giornate",
        label: "Conferenze: numero mezze giornate (al mese)",
        min: 1,
        max: 50,    // 50 mezze giornate/mese: coerente con il limite eventi
        step: 1,
        hasRange: true
      },
      {
        key: "conferenze_prezzo_unitario",
        label: "Conferenze: prezzo unitario mezza giornata",
        min: 0,
        max: 1000,  // €1.000: allineato al prezzo eventi profit
        step: 10,
        hasRange: true
      }
    ]
  },
  {
    mountId: "revenuesCourses",
    group: "revenues",
    fields: [
      {
        key: "corsi_numero_corsi",
        label: "Corsi: numero corsi (al mese)",
        min: 1,
        max: 50,    // 50 corsi/mese: ~2 corsi al giorno, limite realistico
        step: 1,
        hasRange: true
      },
      {
        key: "corsi_partecipanti_per_corso",
        label: "Corsi: partecipanti per corso",
        min: 1,
        max: 50,    // 50 partecipanti: capienza aula formazione piccolo spazio
        step: 1,
        hasRange: true
      },
      {
        key: "corsi_prezzo_a_persona",
        label: "Corsi: prezzo a persona",
        min: 0,
        max: 300,   // €300 a partecipante: corso intensivo di una o due giornate
        step: 5,
        hasRange: true
      },
      {
        key: "corsi_costo_vivo_per_corso",
        label: "Corsi: costi vivi per corso",
        min: 0,
        max: 1000,  // €1.000 di costi diretti per corso (docente, materiali, ecc.)
        step: 10,
        hasRange: true
      }
    ]
  },
  {
    mountId: "fixedCosts",
    group: "costsFixed",
    fields: [
      {
        key: "acqua",
        label: "Acqua (costo mensile)",
        min: 0,
        max: 500,   // €500/mese: bolletta acqua per locale commerciale medio
        step: 5,
        hasRange: false
      },
      {
        key: "elettricita",
        label: "Elettricità (costo mensile)",
        min: 0,
        max: 2000,  // €2.000/mese: bolletta con climatizzazione e attrezzature
        step: 10,
        hasRange: false
      },
      {
        key: "gas",
        label: "Gas (costo mensile)",
        min: 0,
        max: 1500,  // €1.500/mese: riscaldamento invernale picco per spazio medio
        step: 10,
        hasRange: false
      },
      {
        key: "tari",
        label: "TARI (quota mensile)",
        min: 0,
        max: 200,   // €200/mese: quota TARI mensile per locale commerciale medio
        step: 5,
        hasRange: false
      },
      {
        key: "assicurazione",
        label: "Assicurazione (quota mensile)",
        min: 0,
        max: 800,   // €800/mese: polizza RC e danni per locale aperto al pubblico
        step: 5,
        hasRange: false
      },
      {
        key: "pulizie_costo_orario",
        label: "Pulizie: costo orario",
        min: 0,
        max: 50,    // €50/ora: tariffa massima per servizio pulizie professionale
        step: 1,
        hasRange: true
      },
      {
        key: "pulizie_ore",
        label: "Pulizie: numero ore (mensili)",
        min: 0,
        max: 120,   // 120 ore/mese: ~4 ore al giorno, pulizie quotidiane intensive
        step: 1,
        hasRange: true
      }
    ]
  },
  {
    mountId: "variableCosts",
    group: "costsVariable",
    fields: [
      {
        key: "eventi_risorse_costo_orario",
        label: "Produzione eventi: costo orario risorse umane",
        min: 0,
        max: 80,    // €80/ora: tariffa oraria tecnico/coordinatore eventi senior
        step: 1,
        hasRange: true
      },
      {
        key: "eventi_risorse_ore",
        label: "Produzione eventi: ore risorse umane (mensili)",
        min: 0,
        max: 160,   // 160 ore/mese: equivalente a un tempo pieno (4 sett. x 40h)
        step: 1,
        hasRange: true
      },
      {
        key: "manutenzione_ordinaria",
        label: "Manutenzione ordinaria (budget mensile)",
        min: 0,
        max: 500,   // €500/mese: interventi ordinari impianti e arredi
        step: 10,
        hasRange: true
      },
      {
        key: "consumabili_attrezzoteca",
        label: "Consumabili Attrezzoteca (budget mensile)",
        min: 0,
        max: 100,   // €100/mese: acquisto/sostituzione consumabili e piccola attrezzatura
        step: 10,
        hasRange: true
      }
    ]
  },
  {
    mountId: "membershipInputs",
    group: "membership",
    fields: [
      {
        key: "numero_iscritti",
        label: "Numero iscritti",
        min: 0,
        max: 500,   // 500 soci: base associativa grande per un hub comunitario
        step: 1,
        hasRange: true,
        excludeDisabled: true
      }
    ]
  }
];

function formatCurrency(value) {
  // Formatta ogni importo in euro con locale italiano.
  return Number(value || 0).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2
  });
}

function fieldId(group, key) {
  // Genera un identificativo stabile per il metadato di un campo.
  return `${group}.${key}`;
}

function getFieldMeta(id) {
  // Inizializza i metadati del campo solo quando servono.
  if (!appState.fieldMeta[id]) {
    appState.fieldMeta[id] = { excluded: false, locked: false };
  }
  return appState.fieldMeta[id];
}

function isFieldIncluded(group, key) {
  // Un campo è incluso finché non viene escluso dall'utente.
  const meta = getFieldMeta(fieldId(group, key));
  return !meta.excluded;
}

function isFieldLocked(group, key) {
  // Un campo è bloccato quando il valore viene protetto da modifica.
  const meta = getFieldMeta(fieldId(group, key));
  return !!meta.locked;
}

function clampValue(raw, min, max) {
  // Normalizza l'input: numero valido e dentro il range consentito.
  let value = Number(raw);
  if (Number.isNaN(value)) {
    value = min;
  }
  if (value < min) {
    value = min;
  }
  if (value > max) {
    value = max;
  }
  return value;
}

/*
  Riga base per input numerico con eventuale slider,
  esclusione dal totale e lock del dato.
*/
function createControlRow(group, field) {
  // Crea una riga autonoma e riutilizzabile per numero, slider e toggle.
  const { key, label, min, max, step, hasRange, excludeDisabled } = field;
  const id = fieldId(group, key);
  const meta = getFieldMeta(id);

  const row = document.createElement("div");
  row.className = "control-row";
  if (group === "costsFixed" || group === "costsVariable") {
    row.classList.add("pseudo-border-bottom");
  }

  const labelEl = document.createElement("label");
  labelEl.textContent = label;
  labelEl.setAttribute("for", `${id}_number`);

  const pair = document.createElement("div");
  pair.className = hasRange ? "pair" : "pair pair-single";

  const numberInput = document.createElement("input");
  numberInput.type = "number";
  numberInput.id = `${id}_number`;
  numberInput.min = String(min);
  numberInput.max = String(max);
  numberInput.step = String(step);
  numberInput.value = String(appState[group][key]);

  let rangeInput = null;
  if (hasRange) {
    rangeInput = document.createElement("input");
    rangeInput.type = "range";
    rangeInput.id = `${id}_range`;
    rangeInput.min = String(min);
    rangeInput.max = String(max);
    rangeInput.step = String(step);
    rangeInput.value = String(appState[group][key]);
  }

  function setRowDisabled() {
    const isLocked = !!meta.locked;
    numberInput.disabled = isLocked;
    if (rangeInput) {
      rangeInput.disabled = isLocked;
    }
    row.classList.toggle("is-locked", isLocked);
  }

  function applyValue(rawValue) {
    if (isFieldLocked(group, key)) {
      return;
    }
    const value = clampValue(rawValue, min, max);
    appState[group][key] = value;
    numberInput.value = String(value);
    if (rangeInput) {
      rangeInput.value = String(value);
    }
    calculate();
  }

  numberInput.addEventListener("input", (event) => {
    applyValue(event.target.value);
  });

  if (rangeInput) {
    rangeInput.addEventListener("input", (event) => {
      applyValue(event.target.value);
    });
  }

  pair.appendChild(numberInput);
  if (rangeInput) {
    pair.appendChild(rangeInput);
  }

  const toggles = document.createElement("div");
  toggles.className = "toggles";

  const excludeLabel = document.createElement("label");
  const excludeInput = document.createElement("input");
  excludeInput.type = "checkbox";
  excludeInput.checked = meta.excluded;
  excludeInput.disabled = !!excludeDisabled;
  excludeInput.addEventListener("change", (event) => {
    meta.excluded = event.target.checked;
    calculate();
  });
  excludeLabel.appendChild(excludeInput);
  excludeLabel.append(" Escludi");

  const lockLabel = document.createElement("label");
  const lockInput = document.createElement("input");
  lockInput.type = "checkbox";
  lockInput.checked = meta.locked;
  lockInput.addEventListener("change", (event) => {
    meta.locked = event.target.checked;
    setRowDisabled();
    calculate();
  });
  lockLabel.appendChild(lockInput);
  lockLabel.append(" Lock");

  toggles.appendChild(excludeLabel);
  toggles.appendChild(lockLabel);

  row.appendChild(labelEl);
  row.appendChild(pair);
  row.appendChild(toggles);
  setRowDisabled();

  return row;
}

function renderSchemaControls() {
  // Disegna tutti i blocchi configurabili a partire dallo schema dati.
  controlSchemas.forEach((schema) => {
    const mount = document.getElementById(schema.mountId);
    mount.innerHTML = "";
    schema.fields.forEach((field) => {
      mount.appendChild(createControlRow(schema.group, field));
    });
  });
}

/*
  Gestione dinamica operatori fissi.
  Ogni operatore e una riga costo con esclusione e lock.
*/
function addFixedOperator() {
  // Aggiunge un operatore fisso con valori iniziali conservativi.
  const nextNumber = appState.operatorsFixed.length + 1;
  appState.operatorsFixed.push({
    id: Date.now() + Math.floor(Math.random() * 1000),
    nome: `Operatore ${nextNumber}`,
    costo_orario: 20,
    ore: 80,
    excluded: false,
    locked: false
  });
  renderFixedOperators();
  calculate();
}

function deleteFixedOperator(operatorId) {
  // Rimuove un operatore fisso dalla lista corrente.
  appState.operatorsFixed = appState.operatorsFixed.filter((item) => item.id !== operatorId);
  renderFixedOperators();
  calculate();
}

function renderFixedOperators() {
  // Ricrea il pannello operatori per mantenere UI e stato allineati.
  const mount = document.getElementById("fixedOperatorsList");
  mount.innerHTML = "";

  if (appState.operatorsFixed.length === 0) {
    const empty = document.createElement("p");
    empty.className = "helper-text";
    empty.textContent = "Nessun operatore fisso inserito.";
    mount.appendChild(empty);
    return;
  }

  appState.operatorsFixed.forEach((operator) => {
    const row = document.createElement("div");
    row.className = "operator-row pseudo-border-bottom";

    const top = document.createElement("div");
    top.className = "inline";

    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.value = operator.nome;
    nameInput.addEventListener("input", (event) => {
      if (operator.locked) {
        nameInput.value = operator.nome;
        return;
      }
      operator.nome = event.target.value;
      renderScenarioList();
    });

    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.textContent = "Rimuovi";
    removeBtn.disabled = operator.locked;
    removeBtn.addEventListener("click", () => {
      deleteFixedOperator(operator.id);
    });

    top.appendChild(nameInput);
    top.appendChild(removeBtn);

    const controls = document.createElement("div");
    controls.className = "grid two-cols mt-sm";

    const costoBlock = document.createElement("div");
    costoBlock.className = "control-row";
    const costoLabel = document.createElement("label");
    costoLabel.textContent = "Costo orario";
    const costoNumber = document.createElement("input");
    costoNumber.type = "number";
    costoNumber.min = "0";
    costoNumber.max = "200";
    costoNumber.step = "1";
    costoNumber.value = String(operator.costo_orario);
    const costoRange = document.createElement("input");
    costoRange.type = "range";
    costoRange.min = "0";
    costoRange.max = "200";
    costoRange.step = "1";
    costoRange.value = String(operator.costo_orario);
    costoBlock.appendChild(costoLabel);
    costoBlock.appendChild(costoNumber);
    costoBlock.appendChild(costoRange);

    const oreBlock = document.createElement("div");
    oreBlock.className = "control-row";
    const oreLabel = document.createElement("label");
    oreLabel.textContent = "Ore mensili";
    const oreNumber = document.createElement("input");
    oreNumber.type = "number";
    oreNumber.min = "0";
    oreNumber.max = "400";
    oreNumber.step = "1";
    oreNumber.value = String(operator.ore);
    const oreRange = document.createElement("input");
    oreRange.type = "range";
    oreRange.min = "0";
    oreRange.max = "400";
    oreRange.step = "1";
    oreRange.value = String(operator.ore);
    oreBlock.appendChild(oreLabel);
    oreBlock.appendChild(oreNumber);
    oreBlock.appendChild(oreRange);

    function syncOperatorValues(rawCost, rawHours) {
      if (operator.locked) {
        return;
      }
      if (rawCost !== null) {
        operator.costo_orario = clampValue(rawCost, 0, 200);
        costoNumber.value = String(operator.costo_orario);
        costoRange.value = String(operator.costo_orario);
      }
      if (rawHours !== null) {
        operator.ore = clampValue(rawHours, 0, 400);
        oreNumber.value = String(operator.ore);
        oreRange.value = String(operator.ore);
      }
      calculate();
    }

    costoNumber.addEventListener("input", (event) => {
      syncOperatorValues(event.target.value, null);
    });
    costoRange.addEventListener("input", (event) => {
      syncOperatorValues(event.target.value, null);
    });
    oreNumber.addEventListener("input", (event) => {
      syncOperatorValues(null, event.target.value);
    });
    oreRange.addEventListener("input", (event) => {
      syncOperatorValues(null, event.target.value);
    });

    controls.appendChild(costoBlock);
    controls.appendChild(oreBlock);

    const toggles = document.createElement("div");
    toggles.className = "toggles mt-sm";
    const excludeLabel = document.createElement("label");
    const excludeInput = document.createElement("input");
    excludeInput.type = "checkbox";
    excludeInput.checked = operator.excluded;
    excludeInput.addEventListener("change", (event) => {
      operator.excluded = event.target.checked;
      calculate();
    });
    excludeLabel.appendChild(excludeInput);
    excludeLabel.append(" Escludi");

    const lockLabel = document.createElement("label");
    const lockInput = document.createElement("input");
    lockInput.type = "checkbox";
    lockInput.checked = operator.locked;
    lockInput.addEventListener("change", (event) => {
      operator.locked = event.target.checked;
      renderFixedOperators();
      calculate();
    });
    lockLabel.appendChild(lockInput);
    lockLabel.append(" Lock");

    toggles.appendChild(excludeLabel);
    toggles.appendChild(lockLabel);

    costoNumber.disabled = operator.locked;
    costoRange.disabled = operator.locked;
    oreNumber.disabled = operator.locked;
    oreRange.disabled = operator.locked;
    nameInput.disabled = operator.locked;
    row.classList.toggle("is-locked", operator.locked);

    row.appendChild(top);
    row.appendChild(controls);
    row.appendChild(toggles);
    mount.appendChild(row);
  });
}

/*
  Calcola entrate mensili escludendo automaticamente le righe disattivate.
*/
function computeMonthlyRevenues() {
  // Calcola ogni fonte di ricavo separatamente, poi aggrega il totale.
  const r = appState.revenues;

  const studio =
    isFieldIncluded("revenues", "postazioni_studio_mesi") &&
    isFieldIncluded("revenues", "postazioni_studio_costo_mensile")
      ? r.postazioni_studio_mesi * r.postazioni_studio_costo_mensile
      : 0;

  const eventiProfit =
    isFieldIncluded("revenues", "eventi_profit_prezzo_mezza") &&
    isFieldIncluded("revenues", "eventi_profit_mezze_giornate")
      ? r.eventi_profit_prezzo_mezza * r.eventi_profit_mezze_giornate
      : 0;

  const eventiNonProfit =
    isFieldIncluded("revenues", "eventi_non_profit_prezzo_mezza") &&
    isFieldIncluded("revenues", "eventi_non_profit_mezze_giornate")
      ? r.eventi_non_profit_prezzo_mezza * r.eventi_non_profit_mezze_giornate
      : 0;

  const conferenze =
    isFieldIncluded("revenues", "conferenze_numero_mezze_giornate") &&
    isFieldIncluded("revenues", "conferenze_prezzo_unitario")
      ? r.conferenze_numero_mezze_giornate * r.conferenze_prezzo_unitario
      : 0;

  const corsiLordo =
    isFieldIncluded("revenues", "corsi_numero_corsi") &&
    isFieldIncluded("revenues", "corsi_partecipanti_per_corso") &&
    isFieldIncluded("revenues", "corsi_prezzo_a_persona")
      ? r.corsi_numero_corsi * r.corsi_partecipanti_per_corso * r.corsi_prezzo_a_persona
      : 0;

  const corsiCostiVivi =
    isFieldIncluded("revenues", "corsi_numero_corsi") &&
    isFieldIncluded("revenues", "corsi_costo_vivo_per_corso")
      ? r.corsi_numero_corsi * r.corsi_costo_vivo_per_corso
    : 0;

  const corsi = corsiLordo * 0.1 - corsiCostiVivi;

  return {
    studio,
    eventiProfit,
    eventiNonProfit,
    conferenze,
    corsi,
    total: studio + eventiProfit + eventiNonProfit + conferenze + corsi
  };
}

/*
  Calcola uscite mensili suddivise in costi fissi, risorse fisse e variabili.
*/
function computeMonthlyCosts() {
  // Calcola i costi fissi, variabili e del personale in modo trasparente.
  const f = appState.costsFixed;
  const v = appState.costsVariable;

  const utilities = ["acqua", "elettricita", "gas", "tari", "assicurazione"].reduce(
    (acc, key) => (isFieldIncluded("costsFixed", key) ? acc + f[key] : acc),
    0
  );

  const pulizie =
    isFieldIncluded("costsFixed", "pulizie_costo_orario") &&
    isFieldIncluded("costsFixed", "pulizie_ore")
      ? f.pulizie_costo_orario * f.pulizie_ore
      : 0;

  const resourcesFixed = appState.operatorsFixed.reduce((acc, operator) => {
    if (operator.excluded) {
      return acc;
    }
    return acc + operator.costo_orario * operator.ore;
  }, 0);

  const variableEventResources =
    isFieldIncluded("costsVariable", "eventi_risorse_costo_orario") &&
    isFieldIncluded("costsVariable", "eventi_risorse_ore")
      ? v.eventi_risorse_costo_orario * v.eventi_risorse_ore
      : 0;

  const manutenzione = isFieldIncluded("costsVariable", "manutenzione_ordinaria")
    ? v.manutenzione_ordinaria
    : 0;

  const consumabili = isFieldIncluded("costsVariable", "consumabili_attrezzoteca")
    ? v.consumabili_attrezzoteca
    : 0;

  return {
    utilities,
    pulizie,
    resourcesFixed,
    variableEventResources,
    manutenzione,
    consumabili,
    total:
      utilities +
      pulizie +
      resourcesFixed +
      variableEventResources +
      manutenzione +
      consumabili
  };
}

function calculateProjectionRows(monthlyCosts, monthlyRevenuesNoMembership, monthlyMembershipRevenues) {
  // Espande il mese base su più orizzonti temporali per il confronto.
  return projectionHorizons.map((months) => {
    const totalCosts = monthlyCosts * months;
    const totalNoMembership = monthlyRevenuesNoMembership * months;
    const totalMembership = monthlyMembershipRevenues * months;
    const saldo = totalNoMembership + totalMembership - totalCosts;

    return {
      months,
      totalCosts,
      totalNoMembership,
      totalMembership,
      saldo
    };
  });
}

function renderProjectionTable(rows) {
  // Scrive le proiezioni nel corpo della tabella risultati.
  const tbody = document.getElementById("projectionTableBody");
  tbody.innerHTML = "";

  rows.forEach((row) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.months} mesi</td>
      <td>${formatCurrency(row.totalCosts)}</td>
      <td>${formatCurrency(row.totalNoMembership)}</td>
      <td>${formatCurrency(row.totalMembership)}</td>
      <td>${formatCurrency(row.saldo)}</td>
    `;
    tbody.appendChild(tr);
  });
}

/*
  Calcolo complessivo con BEP e suggerimenti per mantenere basso il tesseramento.
*/
function calculate() {
  // Motore centrale: combina ricavi, costi, tesseramento e KPI.
  const revenues = computeMonthlyRevenues();
  const costs = computeMonthlyCosts();

  const monthlyCosts = costs.total;
  const monthlyRevenuesNoMembership = revenues.total;
  const deficitNoMembership = monthlyCosts - monthlyRevenuesNoMembership;

  const iscritti = appState.membership.numero_iscritti;
  const breakEvenMembership =
    iscritti > 0 ? Math.max(0, deficitNoMembership / iscritti) : Number.POSITIVE_INFINITY;

  // Quota minima suggerita: valore di sicurezza, configurabile dall'utente.
  const QUOTA_MINIMA_ANNUALE = Math.max(0, appState.membership.quotaMinimaAnnuale);
  const quotaSuggeritaAnnuale =
    deficitNoMembership <= 0
      ? QUOTA_MINIMA_ANNUALE
      : Math.max(QUOTA_MINIMA_ANNUALE, Math.ceil(breakEvenMembership * 12));
  const bepRaggiunto = deficitNoMembership <= 0;

  // Se il lock è attivo, prevale il valore bloccato; altrimenti si usa il BEP.
  const membershipApplied = appState.membership.lockEnabled
    ? appState.membership.lockValue
    : breakEvenMembership;

  const monthlyMembershipRevenues =
    isFieldIncluded("membership", "numero_iscritti") && Number.isFinite(membershipApplied)
      ? iscritti * membershipApplied
      : 0;

  const monthlyBalance = monthlyRevenuesNoMembership + monthlyMembershipRevenues - monthlyCosts;
  const extraNeeded = monthlyBalance < 0 ? Math.abs(monthlyBalance) : 0;

  const conferenceUnitRevenue =
    appState.revenues.conferenze_prezzo_unitario > 0
      ? appState.revenues.conferenze_prezzo_unitario
      : 0;
  const conferencesExtraForParity =
    conferenceUnitRevenue > 0 ? Math.ceil(extraNeeded / conferenceUnitRevenue) : null;

  const breakEvenIscrittiAtLock =
    appState.membership.lockEnabled && appState.membership.lockValue > 0
      ? Math.ceil(Math.max(0, deficitNoMembership) / appState.membership.lockValue)
      : null;

  const summary = document.getElementById("summary");
  summary.value = [
    `Uscite mensili totali: ${formatCurrency(monthlyCosts)}`,
    `Entrate mensili (senza tessera): ${formatCurrency(monthlyRevenuesNoMembership)}`,
    `Punto di pareggio tessera (per iscritto): ${
      Number.isFinite(breakEvenMembership)
        ? formatCurrency(breakEvenMembership)
        : "N/A (iscritti = 0)"
    }`,
    `Tessera applicata: ${formatCurrency(membershipApplied)}`,
    `Saldo mensile: ${formatCurrency(monthlyBalance)}`,
    `Quota minima suggerita (annuale per iscritto): ${formatCurrency(quotaSuggeritaAnnuale)}/anno${bepRaggiunto ? " — BEP raggiunto, applicata quota minima configurata" : ""}`,
    "Obiettivo: mantenere il tesseramento basso aumentando entrate autonome o riducendo costi inclusi."
  ].join("\n");

  const lockDetails = document.getElementById("lockDetails");
  if (appState.membership.lockEnabled) {
    lockDetails.value = [
      `LOCK MEMBERSHIP ATTIVO a ${formatCurrency(appState.membership.lockValue)} per iscritto.`,
      `Extra fatturato necessario per pareggio: ${formatCurrency(extraNeeded)}`,
      `Conferenze extra stimate per pareggio: ${
        conferencesExtraForParity === null
          ? "impossibile (prezzo conferenza = 0)"
          : conferencesExtraForParity
      }`,
      `Iscritti minimi per pareggio a lock corrente: ${
        breakEvenIscrittiAtLock === null ? "N/A" : breakEvenIscrittiAtLock
      }`
    ].join("\n");
  } else {
    lockDetails.value =
      "Lock membership disattivato: il sistema applica automaticamente la quota di Pareggio.";
  }

    const kpiBreakEven = document.getElementById("kpiBreakEven");
    const kpiMonthlyBalance = document.getElementById("kpiMonthlyBalance");

    if (kpiBreakEven) {
      kpiBreakEven.textContent = Number.isFinite(breakEvenMembership)
        ? formatCurrency(breakEvenMembership)
        : "N/A";
      kpiBreakEven.classList.toggle("is-positive", Number.isFinite(breakEvenMembership) && breakEvenMembership >= 0);
      kpiBreakEven.classList.toggle("is-negative", Number.isFinite(breakEvenMembership) && breakEvenMembership < 0);
    }

    if (kpiMonthlyBalance) {
      kpiMonthlyBalance.textContent = formatCurrency(monthlyBalance);
      kpiMonthlyBalance.classList.toggle("is-positive", monthlyBalance >= 0);
      kpiMonthlyBalance.classList.toggle("is-negative", monthlyBalance < 0);
    }

    const kpiQuotaSuggerita = document.getElementById("kpiQuotaSuggerita");
    if (kpiQuotaSuggerita) {
      kpiQuotaSuggerita.textContent = formatCurrency(quotaSuggeritaAnnuale) + "/anno";
      kpiQuotaSuggerita.classList.toggle("is-positive", bepRaggiunto);
      kpiQuotaSuggerita.classList.toggle("is-negative", !bepRaggiunto);
    }

  const projectionRows = calculateProjectionRows(
    monthlyCosts,
    monthlyRevenuesNoMembership,
    monthlyMembershipRevenues
  );
  renderProjectionTable(projectionRows);

  return {
    monthlyCosts,
    monthlyRevenuesNoMembership,
    deficitNoMembership,
    breakEvenMembership,
    membershipApplied,
    monthlyMembershipRevenues,
    monthlyBalance,
    extraNeeded,
    breakEvenIscrittiAtLock
  };
}

function persistScenarios() {
  // Salva i soli scenari nel localStorage del browser.
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.scenarios));
}

function loadScenariosFromStorage() {
  // Recupera gli scenari salvati, gestendo dati mancanti o corrotti.
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    appState.scenarios = [];
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    appState.scenarios = Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    appState.scenarios = [];
  }
}

function saveScenario() {
  // Salva una fotografia completa dello stato corrente come scenario riutilizzabile.
  const scenarioNameInput = document.getElementById("scenarioName");
  const metrics = calculate();
  const name =
    scenarioNameInput.value.trim() || `Scenario ${new Date().toLocaleString("it-IT")}`;

  const snapshot = {
    revenues: { ...appState.revenues },
    costsFixed: { ...appState.costsFixed },
    costsVariable: { ...appState.costsVariable },
    operatorsFixed: appState.operatorsFixed.map((item) => ({ ...item })),
    membership: { ...appState.membership },
    fieldMeta: JSON.parse(JSON.stringify(appState.fieldMeta))
  };

  appState.scenarios.unshift({
    id: Date.now(),
    name,
    savedAt: new Date().toISOString(),
    state: snapshot,
    metrics: {
      membershipApplied: metrics.membershipApplied,
      breakEvenMembership: metrics.breakEvenMembership,
      monthlyBalance: metrics.monthlyBalance
    }
  });

  persistScenarios();
  renderScenarioList();
  scenarioNameInput.value = "";
}

function loadScenario(scenarioId) {
  // Ripristina lo stato di uno scenario salvato in precedenza.
  const scenario = appState.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) {
    return;
  }

  appState.revenues = { ...scenario.state.revenues };
  appState.costsFixed = { ...scenario.state.costsFixed };
  appState.costsVariable = { ...scenario.state.costsVariable };
  appState.operatorsFixed = scenario.state.operatorsFixed.map((item) => ({ ...item }));
  appState.membership = { ...scenario.state.membership };
  appState.fieldMeta = JSON.parse(JSON.stringify(scenario.state.fieldMeta || {}));

  renderSchemaControls();
  renderFixedOperators();
  syncMembershipLockInputs();
  calculate();
}

function deleteScenario(scenarioId) {
  // Elimina uno scenario dall'archivio locale.
  appState.scenarios = appState.scenarios.filter((item) => item.id !== scenarioId);
  persistScenarios();
  renderScenarioList();
}

function renderScenarioList() {
  // Renderizza la lista degli scenari salvati e le azioni disponibili.
  const tbody = document.getElementById("scenarioTableBody");
  tbody.innerHTML = "";

  if (appState.scenarios.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = "Nessuno scenario salvato.";
    row.appendChild(cell);
    tbody.appendChild(row);
    return;
  }

  appState.scenarios.forEach((scenario) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${scenario.name}</td>
      <td>${formatCurrency(scenario.metrics.membershipApplied)}</td>
      <td>${formatCurrency(scenario.metrics.breakEvenMembership)}</td>
      <td>${formatCurrency(scenario.metrics.monthlyBalance)}</td>
      <td></td>
    `;

    const actionsCell = row.lastElementChild;
    const actions = document.createElement("div");
    actions.className = "actions";

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = "Carica";
    loadBtn.addEventListener("click", () => {
      loadScenario(scenario.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.textContent = "Elimina";
    deleteBtn.addEventListener("click", () => {
      deleteScenario(scenario.id);
    });

    actions.appendChild(loadBtn);
    actions.appendChild(deleteBtn);
    actionsCell.appendChild(actions);
    tbody.appendChild(row);
  });
}

function syncMembershipLockInputs() {
  // Allinea i controlli del tesseramento allo stato corrente dell'app.
  document.getElementById("membershipLockEnabled").checked = appState.membership.lockEnabled;
  document.getElementById("membershipLockValue").value = String(appState.membership.lockValue);
  document.getElementById("membershipQuotaMinima").value = String(appState.membership.quotaMinimaAnnuale);
}

function wireGlobalControls() {
  // Collega gli eventi globali che non appartengono a un singolo controllo schema.
  const addOperatorBtn = document.getElementById("addFixedOperatorBtn");
  const lockEnabled = document.getElementById("membershipLockEnabled");
  const lockValue = document.getElementById("membershipLockValue");
  const quotaMinima = document.getElementById("membershipQuotaMinima");
  const saveScenarioBtn = document.getElementById("saveScenarioBtn");

  addOperatorBtn.addEventListener("click", addFixedOperator);

  lockEnabled.addEventListener("change", (event) => {
    appState.membership.lockEnabled = event.target.checked;
    calculate();
  });

  lockValue.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    appState.membership.lockValue = Number.isNaN(value) || value < 0 ? 0 : value;
    event.target.value = String(appState.membership.lockValue);
    calculate();
  });

  quotaMinima.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    appState.membership.quotaMinimaAnnuale = Number.isNaN(value) || value < 0 ? 0 : value;
    event.target.value = String(appState.membership.quotaMinimaAnnuale);
    calculate();
  });

  saveScenarioBtn.addEventListener("click", saveScenario);
}

function init() {
  // Sequenza di avvio: render, bind eventi, load scenari e primo calcolo.
  renderSchemaControls();
  renderFixedOperators();
  wireGlobalControls();
  loadScenariosFromStorage();
  renderScenarioList();
  syncMembershipLockInputs();
  calculate();
}

init();
