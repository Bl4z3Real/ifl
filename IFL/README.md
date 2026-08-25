# IFL — International Football League

Simulatore di carriera calcistica, giocabile interamente nel browser (HTML5 + CSS3 + JavaScript puro, nessuna dipendenza esterna a parte i font Google).

## Come avviarlo

Non serve alcuna installazione:

1. Estrai la cartella `IFL/`.
2. Apri `index.html` con un doppio click (o con "Apri con → Browser").
3. Gioca. I salvataggi restano nel browser (LocalStorage): se chiudi e riapri, la carriera è ancora lì.

Per lo sviluppo consigliato un piccolo server locale (es. `npx serve` nella cartella, oppure l'estensione "Live Server" di VS Code), utile solo per evitare eventuali restrizioni del browser sui file locali — ma il gioco funziona anche aprendo `index.html` direttamente.

## Struttura del progetto

```
IFL/
├── index.html
├── style.css
├── README.md
├── assets/
│   ├── logo/ifl-logo.png          (logo fornito, non modificato)
│   └── backgrounds/menu-bg.jpg    (background stadio fornito, non modificato)
└── js/
    ├── data.js         → nazioni, club, ruoli, stili, nomi, elenco trofei/premi
    ├── state.js         → salvataggi (LocalStorage), classifica globale
    ├── player.js         → creazione giocatore, calcolo overall, sistema di crescita
    ├── simulation.js     → motore di simulazione delle partite/infortuni
    ├── events.js         → eventi casuali di carriera
    ├── career.js         → stagioni, trasferimenti, contratti, nazionale, ritiro
    ├── awards.js         → icone/etichette per trofei e premi
    ├── ui.js             → rendering di tutte le schermate e modali
    └── main.js           → collegamento eventi/interfaccia
```

## Dipendenze

Nessuna libreria esterna. Unica risorsa remota: i font "Oswald" e "Inter" da Google Fonts (richiede una connessione internet minima al primo caricamento; se offline, il browser userà i font di sistema come fallback).

## Funzionalità implementate

- **Creazione calciatore**: nome, età, nazionalità, altezza, piede, ruolo (10 posizioni), stile di gioco (8 stili), club iniziale, con anteprima statistiche in tempo reale.
- **Statistiche complete**: velocità, tiro, passaggio, dribbling, difesa, fisico, tecnica, mentalità + overall/potenziale calcolati in base al ruolo; forma, morale, reputazione, valore di mercato, stipendio, affidabilità, condizione fisica.
- **Crescita realistica**: dipende da età, potenziale, minuti giocati, media voto, infortuni, focus di allenamento e stile scelto; curva con esplosione giovanile, picco, e declino naturale dopo i 30-33 anni.
- **Simulazione partite**: il piazzamento da titolare, il voto, i gol e gli assist dipendono da statistiche, forma, morale, condizione e forza dell'avversario — non da un semplice numero casuale.
- **Sistema stagionale**: 30 giornate per stagione, riepilogo dettagliato a fine anno (presenze, minuti, gol, assist, media voto, trofei, posizione).
- **Allenamento**: scelta del focus settimanale tra 8 aree, con effetto reale sulle statistiche e consumo di condizione fisica.
- **Infortuni**: lievi, medi, gravi e ricorrenti, con impatto su partite disponibili, forma e crescita.
- **Eventi casuali**: prestazioni straordinarie, periodi negativi, litigi con l'allenatore, cambio tecnico, pressione mediatica, aiuto di un compagno, record personali — ognuno con conseguenze meccaniche reali.
- **Trasferimenti e contratti**: offerte generate in base a overall, età, forma, reputazione e prestigio del club; rinnovo, accettazione o permanenza gestibili a fine stagione.
- **Nazionale**: convocazioni, presenze, gol, assist, possibilità di diventare capitano, tornei internazionali biennali con relativo trofeo.
- **Trofei e premi individuali**: campionato, coppa nazionale, coppa internazionale per club, trofei con la nazionale; Miglior Giovane, Capocannoniere, Miglior Assistman, Giocatore dell'Anno, MVP, Squadra dell'Anno, Premio Leggenda.
- **Profilo giocatore completo** con bacheca trofei/premi e statistiche correnti.
- **Storico/timeline di carriera** consultabile in ogni momento, stagione per stagione.
- **Valutazione finale di carriera**: al ritiro (per scelta o per età), il gioco assegna una categoria — Talento, Professionista, Stella, Leggenda, Icona, Immortale — calcolata internamente da trofei, gol, presenze, nazionale, longevità e premi (nessun punteggio numerico mostrato).
- **Classifica locale** delle carriere concluse, ordinata per rendimento complessivo.
- **Salvataggio automatico** su LocalStorage, più slot, possibilità di continuare o eliminare carriere.
- **Design responsive**: menu a mattonelle, dashboard e moduli adattati a desktop, tablet e smartphone.
- **Identità visiva**: logo e background forniti utilizzati integralmente; palette oro/nero/notturna coerente in tutte le schermate.

## Note

Club, campionati e nomi sono originali e inventati per IFL — nessun asset, logo o nome di terzi è stato utilizzato.
