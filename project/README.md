# 📄 AI PDF Resume & Analysis Dashboard

Una moderna applicazione web **Full-Stack** progettata per analizzare documenti PDF sfruttando l'Intelligenza Artificiale di **Google Gemini**, dotata di un sistema di autenticazione sicuro e gestione dello storico personale per revisione degli stessi documenti.

---

## ✨ Caratteristiche Principali

* **Autenticazione Doppia e Sicura**: 
  * Registrazione e login locale con password protette tramite crittografia avanzata (utilizzo della libreria `bcrypt`).
  * Accesso rapido e sicuro tramite **Google OAuth** per login tramite Gmail.(`@react-oauth/google`).
* **Analisi Intelligente con AI**: Integrazione con l'API di Google Gemini (`@google/generative-ai`) per estrarre il testo dai file PDF e generare riassunti concisi e concetti chiave strutturati attrvaerso un prompt predefinito via codice.
* **Storico Personale**: Archivio persistente delle analisi effettuate, associato al singolo utente e consultabile in qualsiasi momento, oridnato per data(dalla più recente alla meno recente).
* **Persistenza della Sessione**: Gestione intelligente dello stato di login tramite il `localStorage` del browser per evitare disconnessioni accidentali al ricaricamento della pagina.
* **Interfaccia Utente Curata**: UI moderna sviluppata in React con feedback visivo interattivo.

---

## Architettura e Stack Tecnologico

Il progetto adotta un'architettura client-server disaccoppiata:

### Frontend
* **React** (con Vite per un avvio ultra-rapido)
* **Gestione dello stato** nativa tramite React Hooks (`useState`)
* **Librerie terze**: `@react-oauth/google`, `jwt-decode`

### Backend
* **Node.js** & **Express** (per la gestione delle rotte API)
* **SQLite3** (Database relazionale locale, leggero e performante). Il database è locale per motivi di gestione semplificata in quanto il software non è stato effettivamente pubblicato ma solo esposto.
* **Bcrypt** : Per l'hashing sicuro delle password utente.
* **Multer** & **pdf2json** Per la gestione dei file caricati e l'estrazione testuale dei PDF.

---

## Sicurezza e Privacy

* **Protezione delle Credenziali**: Le password non vengono mai salvate in chiaro nel database, ma cifrate tramite algoritmi di hashing con salt (`bcrypt`).
* **Gestione delle Variabili d'Ambiente**: La chiave segreta dell'API di Google Gemini (`GEMINI_API_KEY`) è isolata tramite file `.env` ed esclusa dal controllo di versione grazie a `.gitignore`.

---

## Guida all'Installazione e Avvio Locale

Se desideri clonare ed eseguire questo progetto sul tuo computer, segui questi passaggi:

### 1. Clona il repository
```bash
git clone https://github.com/matteodossi99/Ai_pdf_resume.git
cd Ai_pdf_resume

### 2. Spostati nella cartella del backend
cd project/backend

### 3. Installa le dipendenze
npm install

### 4. Crea il file ".env"
Nella cartella del backend usando come riferimento il file .env.example. Il file deve contenere soltanto la chiave necessaria in questo formato:
GEMINI_API_KEY=la_tua_chiave_api_di_google_gemini

### 5. avvia il server di sviluppo
Sempre dalla cartella del backend: node server.js

### 6.Avvia l'interfaccia untente
Sempre da terminale mi sposto nella cartella "cd project/frontend"
digitare successivamente: npm run dev