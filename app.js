"use strict";

/*
  STF - Logica del calcolatore in file separato.
  Tutto lo stato dell'app vive in appState.
*/

const STORAGE_KEY = "stf_scenari_v1";

// Stato centrale dell'applicazione.
const appState = {
  costs: {
    personale_fisso: 3000,
    utenze: 900,
    manutenzione_attrezzoteca: 400
  },
  revenues: {
    atelier_mesi_occupati: 10,
    atelier_prezzo_mensile: 850,
    eventi_giorni_profit: 4,
    eventi_prezzo_profit: 600,
    eventi_giorni_non_profit: 4,
    eventi_prezzo_non_profit: 350,
    conferenze_numero_mezze_giornate: 6,
    conferenze_prezzo_unitario: 250,
    corsi_numero_corsi: 4,
    corsi_partecipanti_per_corso: 14,
    corsi_prezzo_a_persona: 45,
    corsi_costo_vivo_per_corso: 180
  },
  membership: {
    numero_iscritti: 120,
    lockEnabled: false,
    lockValue: 10
  },
  scenarios: []
};

// Schema dei campi da renderizzare con input number + slider.
const inputSchema = [
  {
    mountId: "fixedCosts",
    group: "costs",
    fields: [
      ["personale_fisso", "Personale fisso", 0, 20000, 50],
      ["utenze", "Utenze", 0, 5000, 10],
      ["manutenzione_attrezzoteca", "Manutenzione attrezzoteca", 0, 5000, 10]
    ]
  },
  {
    mountId: "revenues",
    group: "revenues",
    fields: [
      ["atelier_mesi_occupati", "Atelier: mesi occupati", 1, 12, 1],
      ["atelier_prezzo_mensile", "Atelier: prezzo mensile", 0, 5000, 10],
      ["eventi_giorni_profit", "Eventi aziendali: giorni profit", 0, 31, 1],
      ["eventi_prezzo_profit", "Eventi aziendali: prezzo profit", 0, 5000, 10],
      ["eventi_giorni_non_profit", "Eventi aziendali: giorni non profit", 0, 31, 1],
      ["eventi_prezzo_non_profit", "Eventi aziendali: prezzo non profit", 0, 5000, 10],
      ["conferenze_numero_mezze_giornate", "Conferenze: numero mezze giornate", 0, 62, 1],
      ["conferenze_prezzo_unitario", "Conferenze: prezzo unitario", 0, 5000, 10],
      ["corsi_numero_corsi", "Corsi: numero corsi", 0, 100, 1],
      ["corsi_partecipanti_per_corso", "Corsi: partecipanti per corso", 0, 200, 1],
      ["corsi_prezzo_a_persona", "Corsi: prezzo a persona", 0, 1000, 1],
      ["corsi_costo_vivo_per_corso", "Corsi: costo vivo per corso", 0, 20000, 10]
    ]
  },
  {
    mountId: "membership",
    group: "membership",
    fields: [["numero_iscritti", "Numero iscritti", 0, 10000, 1]]
  }
];

// Formattazione uniforme in EUR per tutti i risultati economici.
function formatCurrency(value) {
  return Number(value || 0).toLocaleString("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2
  });
}

// Crea una riga di controllo composta da input numerico e slider sincronizzati.
function createControlRow(group, key, labelText, min, max, step) {
  const row = document.createElement("div");
  row.className = "control-row";

  const label = document.createElement("label");
  label.setAttribute("for", `${group}_${key}_number`);
  label.textContent = labelText;

  const pair = document.createElement("div");
  pair.className = "pair";

  const numberInput = document.createElement("input");
  numberInput.type = "number";
  numberInput.id = `${group}_${key}_number`;
  numberInput.min = String(min);
  numberInput.max = String(max);
  numberInput.step = String(step);
  numberInput.value = String(appState[group][key]);

  const rangeInput = document.createElement("input");
  rangeInput.type = "range";
  rangeInput.id = `${group}_${key}_range`;
  rangeInput.min = String(min);
  rangeInput.max = String(max);
  rangeInput.step = String(step);
  rangeInput.value = String(appState[group][key]);

  // Normalizza il valore, aggiorna stato centrale e rilancia il calcolo.
  function applyValue(rawValue) {
    let value = Number(rawValue);
    if (Number.isNaN(value)) {
      value = min;
    }
    if (value < min) {
      value = min;
    }
    if (value > max) {
      value = max;
    }

    appState[group][key] = value;
    numberInput.value = String(value);
    rangeInput.value = String(value);
    calculate();
  }

  numberInput.addEventListener("input", (event) => {
    applyValue(event.target.value);
  });

  rangeInput.addEventListener("input", (event) => {
    applyValue(event.target.value);
  });

  pair.appendChild(numberInput);
  pair.appendChild(rangeInput);
  row.appendChild(label);
  row.appendChild(pair);

  return row;
}

// Renderizza tutti i controlli definiti nello schema.
function renderControls() {
  inputSchema.forEach((section) => {
    const mount = document.getElementById(section.mountId);
    section.fields.forEach((field) => {
      const [key, label, min, max, step] = field;
      mount.appendChild(createControlRow(section.group, key, label, min, max, step));
    });
  });
}

// Calcola le entrate non derivanti dal tesseramento.
function computeRevenues() {
  const r = appState.revenues;

  const atelier = r.atelier_mesi_occupati * r.atelier_prezzo_mensile;
  const eventi =
    r.eventi_giorni_profit * r.eventi_prezzo_profit +
    r.eventi_giorni_non_profit * r.eventi_prezzo_non_profit;
  const conferenze = r.conferenze_numero_mezze_giornate * r.conferenze_prezzo_unitario;

  // Logica corsi: 10% del lordo meno i costi vivi per corso.
  const corsoLordoPerCorso = r.corsi_partecipanti_per_corso * r.corsi_prezzo_a_persona;
  const quotaSpazioPerCorso = corsoLordoPerCorso * 0.1 - r.corsi_costo_vivo_per_corso;
  const corsi = r.corsi_numero_corsi * quotaSpazioPerCorso;

  return {
    atelier,
    eventi,
    conferenze,
    corsi,
    totaleAltreEntrate: atelier + eventi + conferenze + corsi
  };
}

// Funzione principale: calcola sostenibilità, membership ideale e gap eventuale.
function calculate() {
  const c = appState.costs;
  const m = appState.membership;
  const rev = computeRevenues();

  const totaleUscite = c.personale_fisso + c.utenze + c.manutenzione_attrezzoteca;
  const deficitSenzaTesseramento = totaleUscite - rev.totaleAltreEntrate;

  const iscritti = m.numero_iscritti;
  const costoMembershipIdeale =
    iscritti > 0 ? deficitSenzaTesseramento / iscritti : Number.POSITIVE_INFINITY;

  // Se lock attivo, prevale il valore bloccato dall'utente.
  const membershipApplicata = m.lockEnabled ? m.lockValue : costoMembershipIdeale;
  const totaleEntrateConMembership =
    rev.totaleAltreEntrate +
    iscritti * (Number.isFinite(membershipApplicata) ? membershipApplicata : 0);
  const saldoFinale = totaleEntrateConMembership - totaleUscite;

  // Gap residuo da coprire con altre attivita.
  const extraNecessario = saldoFinale < 0 ? Math.abs(saldoFinale) : 0;
  const prezzoConferenza = appState.revenues.conferenze_prezzo_unitario;
  const conferenzeExtra =
    prezzoConferenza > 0 ? Math.ceil(extraNecessario / prezzoConferenza) : null;

  const summary = document.getElementById("summary");
  summary.value = [
    `Totale uscite: ${formatCurrency(totaleUscite)}`,
    `Totale altre entrate: ${formatCurrency(rev.totaleAltreEntrate)}`,
    `Deficit (senza tesseramento): ${formatCurrency(deficitSenzaTesseramento)}`,
    `Costo membership ideale: ${
      Number.isFinite(costoMembershipIdeale)
        ? formatCurrency(costoMembershipIdeale)
        : "N/A (iscritti = 0)"
    }`,
    `Costo membership applicato: ${
      Number.isFinite(membershipApplicata) ? formatCurrency(membershipApplicata) : "N/A"
    }`,
    `Saldo finale: ${formatCurrency(saldoFinale)}`
  ].join("\n");

  const lockDetails = document.getElementById("lockDetails");
  if (m.lockEnabled) {
    lockDetails.value = [
      `LOCK ATTIVO a ${formatCurrency(m.lockValue)} per iscritto`,
      `Extra fatturato richiesto per pareggio: ${formatCurrency(extraNecessario)}`,
      `Equivalente conferenze extra (stima): ${
        conferenzeExtra === null
          ? "impossibile (prezzo conferenza = 0)"
          : conferenzeExtra
      }`
    ].join("\n");
  } else {
    lockDetails.value =
      "Lock disattivato: la membership viene calcolata automaticamente sul pareggio.";
  }

  return {
    totaleUscite,
    ...rev,
    deficitSenzaTesseramento,
    costoMembershipIdeale,
    membershipApplicata,
    saldoFinale,
    extraNecessario,
    conferenzeExtra
  };
}

// Legge gli scenari persistiti nel browser.
function loadScenariosFromStorage() {
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

// Persiste l'array scenari in localStorage.
function persistScenarios() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(appState.scenarios));
}

// Salva uno snapshot completo di stato + metriche correnti.
function saveScenario() {
  const nameInput = document.getElementById("scenarioName");
  const name = nameInput.value.trim() || `Scenario ${new Date().toLocaleString("it-IT")}`;
  const snapshot = JSON.parse(JSON.stringify(appState));
  const metrics = calculate();

  const scenario = {
    id: Date.now(),
    name,
    savedAt: new Date().toISOString(),
    state: {
      costs: snapshot.costs,
      revenues: snapshot.revenues,
      membership: snapshot.membership
    },
    metrics: {
      deficitSenzaTesseramento: metrics.deficitSenzaTesseramento,
      membershipApplicata: metrics.membershipApplicata,
      saldoFinale: metrics.saldoFinale
    }
  };

  appState.scenarios.unshift(scenario);
  persistScenarios();
  renderScenarioList();
  nameInput.value = "";
}

// Aggiorna i valori degli input a partire da appState (utile dopo load scenario).
function applyStateToInputs() {
  inputSchema.forEach((section) => {
    section.fields.forEach((field) => {
      const key = field[0];
      const value = appState[section.group][key];
      const n = document.getElementById(`${section.group}_${key}_number`);
      const r = document.getElementById(`${section.group}_${key}_range`);
      if (n) {
        n.value = String(value);
      }
      if (r) {
        r.value = String(value);
      }
    });
  });

  document.getElementById("membershipLockEnabled").checked = appState.membership.lockEnabled;
  document.getElementById("membershipLockValue").value = String(appState.membership.lockValue);
}

// Carica uno scenario salvato e ricalcola i risultati.
function loadScenario(scenarioId) {
  const scenario = appState.scenarios.find((item) => item.id === scenarioId);
  if (!scenario) {
    return;
  }

  appState.costs = { ...scenario.state.costs };
  appState.revenues = { ...scenario.state.revenues };
  appState.membership = { ...scenario.state.membership };

  applyStateToInputs();
  calculate();
}

// Elimina uno scenario dalla lista persistita.
function deleteScenario(scenarioId) {
  appState.scenarios = appState.scenarios.filter((item) => item.id !== scenarioId);
  persistScenarios();
  renderScenarioList();
}

// Disegna la tabella scenari con azioni carica/elimina.
function renderScenarioList() {
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

    const lockText = scenario.state.membership.lockEnabled
      ? formatCurrency(scenario.state.membership.lockValue)
      : "Auto";

    row.innerHTML = `
      <td>${scenario.name}</td>
      <td>${scenario.state.membership.numero_iscritti}</td>
      <td>${lockText}</td>
      <td>${formatCurrency(scenario.metrics.deficitSenzaTesseramento)}</td>
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

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.textContent = "Elimina";
    delBtn.addEventListener("click", () => {
      deleteScenario(scenario.id);
    });

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);
    actionsCell.appendChild(actions);
    tbody.appendChild(row);
  });
}

// Collega lock membership e pulsante di salvataggio agli handler.
function wireGlobalControls() {
  const lockEnabled = document.getElementById("membershipLockEnabled");
  const lockValue = document.getElementById("membershipLockValue");
  const saveBtn = document.getElementById("saveScenarioBtn");

  lockEnabled.addEventListener("change", (event) => {
    appState.membership.lockEnabled = event.target.checked;
    calculate();
  });

  lockValue.addEventListener("input", (event) => {
    const value = Number(event.target.value);
    appState.membership.lockValue = Number.isNaN(value) || value < 0 ? 0 : value;
    if (String(appState.membership.lockValue) !== event.target.value) {
      event.target.value = String(appState.membership.lockValue);
    }
    calculate();
  });

  saveBtn.addEventListener("click", saveScenario);
}

// Bootstrapping iniziale della pagina.
function init() {
  renderControls();
  wireGlobalControls();
  loadScenariosFromStorage();
  renderScenarioList();
  calculate();
}

init();
