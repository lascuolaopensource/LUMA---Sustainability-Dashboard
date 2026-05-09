# STF Sustainability Tool - Progettare la Sostenibilità Comunitaria

**STF Sustainability Tool** è un simulatore economico per lo **Spazio delle Tradizioni Future** di **Loro Piceno**, progettato per aiutare il gruppo di lavoro a bilanciare due obiettivi che, in un progetto comunitario, devono convivere senza semplificazioni: la **sostenibilità finanziaria** e l’**accessibilità democratica dello spazio**.

Il tool nasce all’interno del workshop **XYZ - Val di Fiastra 2026** come strumento di supporto alle decisioni, utile per esplorare scenari, stimare il break-even point e capire come distribuire il peso economico tra tesseramento e altre attività generatrici di reddito.

## Visione e contesto

Lo STF si colloca nel quadro della **Val di Fiastra**, un territorio costruito in relazione fra **6 comuni** e molteplici realtà locali che condividono una visione di sviluppo cooperativo, culturale e produttivo.

In questa prospettiva, lo spazio non è solo un contenitore di servizi: è un’**infrastruttura territoriale** che unisce l’antico mestiere, la memoria materiale e relazionale della **mezzadria** e dell’**artigianato**, con le nuove tecnologie, i linguaggi contemporanei e i modelli organizzativi aperti.

All’interno di questa visione, l’**Attrezzoteca** viene interpretata come un vero e proprio **dispositivo politico-economico di comunità**: non soltanto un insieme di beni condivisi, ma uno strumento che abilita cooperazione, mutualismo, cura del bene comune e redistribuzione del valore.

## Funzionalità del tool

Il simulatore è stato pensato per essere leggibile, modulare e utilizzabile anche durante un workshop partecipato.

### Entrate

Il modello include un sistema dinamico basato su slider e campi numerici per stimare le principali fonti di entrata:

- **Tesseramento**
- **Postazioni Studio**
- **Eventi**
- **Conferenze**
- **Corsi**

La logica consente di distinguere tra entrate ordinarie, entrate legate a servizi e ricavi variabili, mantenendo una lettura immediata del contributo di ogni area.

### Uscite

Il calcolo delle uscite è diviso in:

- **Costi fissi**
- **Costi variabili**

Questa suddivisione rende più chiaro quali componenti incidono strutturalmente sul bilancio mensile e quali dipendono dall’attivazione concreta delle attività.

### Sistema di Lock

Il tool include un sistema di **Lock / Lucchetto** che permette di bloccare variabili specifiche e ricalcolare di conseguenza il **break-even point**.

In pratica, il lock consente di simulare casi in cui una quota, un prezzo o un parametro vengono fissati a priori, per verificare:

- quanto manca per andare in pareggio;
- quale deve essere il contributo delle altre linee di attività;
- come mantenere il tesseramento il più basso possibile senza compromettere la sostenibilità.

### Visualizzazione a tre colonne

L’interfaccia è organizzata in una struttura a **tre colonne**:

- **Entrate**
- **Uscite**
- **Risultati**

La colonna risultati è pensata per rimanere sempre visibile e offrire feedback semantico immediato, grazie a una lettura cromatica coerente con il contesto territoriale.

## Identità cromatica

La palette del progetto deriva dal paesaggio e dalla materia visiva della **Val di Fiastra**. I colori non sono decorativi: servono a orientare la lettura funzionale del simulatore e a mantenere un’identità locale riconoscibile.

### Colori principali

- **Mistrà** `#F6F5EE` - sfondo generale, tono chiaro e neutro
- **Nero mpestatu** `#2F2D2E` - testo, bordi e struttura
- **Rosciu** `#E53323` - negativo, alert, criticità
- **Grugni** `#4A6641` - positivo, guadagno, equilibrio
- **Fiastrella** `#66C0BE` - accento principale, slider, stato lock
- **Perseca** `#F5B0A5` - accento secondario
- **Jia** `#C9CC83` - highlight terziario

Questa palette vuole restituire una grammatica visiva sobria, territoriale e leggibile, coerente con l’anima del progetto.

## Come funziona

1. Imposta i valori delle **entrate** e delle **uscite**.
2. Osserva il **saldo mensile** e il **break-even point**.
3. Attiva il **lucchetto** su una variabile per simulare vincoli reali.
4. Confronta scenari diversi grazie al salvataggio in **localStorage**.
5. Valuta come ridurre il tesseramento mantenendo lo spazio sostenibile nel tempo.

## Link utili

- [Qui Val di Fiastra](https://www.quivaldifiastra.com/)
- [La Scuola Open Source](https://lascuolaopensource.xyz/)
- [Borgofuturo](https://borgofuturo.net/)

## Credits

Questo progetto è stato sviluppato come strumento di lavoro e di confronto collettivo nel contesto del **workshop XYZ 2026**.

Un ringraziamento ai partecipanti del workshop, ai docenti del **Gruppo Z - Governance**, e ai partner locali che hanno contribuito alla visione e al processo di co-progettazione:

- **Inabita**
- **Cooperativa di Comunità**
- **Wikiloro**
- e tutte le realtà territoriali che hanno sostenuto il percorso.

## Licenza

Il progetto è rilasciato come **Open Source** sotto licenza **MIT** o licenza equivalente compatibile con l’uso, la modifica e la redistribuzione del codice.

## Struttura del progetto

- `index.html` - struttura dell’interfaccia
- `styles.css` - layout e identità visiva
- `app.js` - logica di simulazione e salvataggio scenari

## Nota finale

STF Sustainability Tool non è soltanto un calcolatore: è un supporto per discutere modelli di sostenibilità che tengano insieme cura, accessibilità e autonomia economica di comunità.
