require('dotenv').config();
//import necessary libraries
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const PDFParser = require('pdf2json');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt'); //handle hash passwords

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const app = express();
const PORT = 3000;
const upload = multer({ dest: 'uploads/' });
app.use(cors());
app.use(express.json());

//initialize SQLite database
const db = new sqlite3.Database('./database.sqlite', (err) => {
  if (err) {
    console.error('Errore durante l\'apertura del database SQLite:', err.message);
  } else {
    console.log('Connessione al database SQLite avvenuta con successo.');
  }
});

//creo le tabelle di utenti e documenti se non esistono già
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS utenti (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS storico (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email_utente TEXT,
    nome_file TEXT,
    sintesi TEXT,
    data TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);
});

//repeate the request to Gemini API in case of 503 error (server busy) with exponential backoff
async function chiamaGeminiConTentativi(model, prompt, tentativiMassimi = 4) {
  for (let tentativo = 1; tentativo <= tentativiMassimi; tentativo++) {
    try {
      console.log(`Tentativo di connessione a Gemini #${tentativo} in corso...`);
      const risultato = await model.generateContent(prompt);
      return await risultato.response.text();
    } catch (error) {
      // Check if the error is a 503 (Service Unavailable) or related to server overload
      const isTrafficoIntenso = error.status === 503 || (error.message && error.message.includes('503'));

      if (isTrafficoIntenso && tentativo < tentativiMassimi) {
        //compute the wait time for the next attempt using exponential backoff
        const tempoAttesa = tentativo * 3000;
        console.log(`Server di Google sovraccarichi (503). Nuovo tentativo automatico tra ${tempoAttesa / 1000} secondi...`);
        await new Promise(resolve => setTimeout(resolve, tempoAttesa));
      } else {
        //if we've exhausted our attempts, throw the error
        throw error;
      }
    }
  }
}

//method to handle the file upload and AI analysis
app.post('/api/uploads/', upload.single('pdfFile'), (request, response) => {
  if (!request.file) {
    return response.status(400).json({ errore: 'Nessun file caricato.' });
  }

  const pdfParser = new PDFParser(null, 1);

  pdfParser.on("pdfParser_dataError", (errData) => {
    console.error("Errore lettura PDF:", errData.parserError);
    fs.unlinkSync(request.file.path);
    return response.status(500).json({ errore: 'Impossibile estrarre il testo dal file PDF.' });
  });

  pdfParser.on("pdfParser_dataReady", async () => {
    try {
      const testoEstratto = pdfParser.getRawTextContent();
      fs.unlinkSync(request.file.path);
      const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

      const prompt = `Analizza il seguente testo estratto da un documento PDF e fornisci:
      1. Un riassunto conciso dei punti principali.
      2. Una lista dei concetti chiave.
      
      Testo del documento:
      ${testoEstratto.substring(0, 8000)}`;

      //call the Gemini API with retries in case of server overload
      const rispostaAI = await chiamaGeminiConTentativi(model, prompt);

      //create the history of an accuount through db
      const emailUtente = request.body.email || 'utente@test.it';
      const nomeFile = request.file.originalname;
      const dataOdierna = new Date().toLocaleDateString('it-IT');
      const query = `INSERT INTO storico (email_utente, nome_file, sintesi, data) VALUES (?, ?, ?, ?)`;
      db.run(query, [emailUtente, nomeFile, rispostaAI, dataOdierna], function (err) {
        if (err) {
          console.error('Errore durante l\'inserimento nello storico:', err.message);
        } else {
          console.log(`Storico aggiornato con successo per l'utente ${emailUtente}.`);
        }
      });

      //manage the AI response and send it back to the frontend
      response.json({
        messaggio: 'Analisi completata con successo da Gemini!',
        risultato: rispostaAI
      });

    } catch (error) {
      console.error('Errore definitivo durante la comunicazione con Gemini:', error);
      return response.status(500).json({
        errore: 'I server di Google sono estremamente occupati al momento. Abbiamo effettuato diversi tentativi automatici senza successo. Riprova tra qualche minuto.'
      });
    }
  });

  pdfParser.loadPDF(request.file.path);
});


////// ROTTE PER LA GESTIONE DELLE CHIAMATE DEGLI UTENTI E DELLO STORICO /////////

//route to register a new user
app.post('/api/register', async (request, response) => {
  const { email, password } = request.body;
  if (!email || !password) {
    return response.status(400).json({ errore: 'Email e password inserite non sono valide.' });
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  //insert a new user into the database
  const query = `INSERT INTO utenti (email, password) VALUES (?, ?)`;
  db.run(query, [email, hashedPassword], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return response.status(400).json({ errore: 'L\'email è già registrata.' });
      }
      return response.status(500).json({ errore: 'Errore durante la registrazione dell\'utente.' });
    }
    response.json({ messaggio: 'Registrazione avvenuta con successo!' });
  });
});

//route to login an existing user
app.post('/api/login', (request, response) => {
  const { email, password } = request.body;
  if (!email || !password) {
    return response.status(400).json({ errore: 'Email e/o password inserite non sono valide.' });
  }

  //check if the user exists in the database
  const query = `SELECT * FROM utenti WHERE email = ?`;
  db.get(query, email, async (err, row) => {
    if (err) {
      return response.status(500).json({ errore: 'Errore durante il login dell\'utente lato server.' });
    }
    if (!row) {
      return response.status(401).json({ errore: 'Email o password errate.' });
    }

      
    try {
      //compare the provided password with the hashed password in the database
      passwordCorretta = await bcrypt.compare(password, row.password);
      if (!passwordCorretta) {
        return res.status(400).json({ errore: 'Password errata.' });
      }
      response.json({ messaggio: 'Login avvenuto con successo!', email: row.email });

    } catch (error) {
      return response.status(500).json({ errore: 'Errore durante la verifica della password.' });
    }

  });
});

//route to login and save data from google
app.post('/api/google-login', (request, response) => {
  //prendo mail
  const email = request.body.email;
  //verifico non sia vuota--> in caso errore 400
  if (!email) {
    return response.status(400).json({ errore: 'Email mancante.' });
  }
  //query: ce utente nel db?
  const query = `SELECT * FROM utenti WHERE email = ?`;
  db.get(query, [email], (err, row) => {
    if (err) {
      return response.status(500).json({ errore: 'Errore durante il login con Google.' });
    }
    if (row) {
      //se esiste--> login avvenuto con successo
      return response.json({ messaggio: 'Login avvenuto con successo!', email: row.email });
    } else {
      //se non esiste--> creo nuovo utente
      const queryInsert = `INSERT INTO utenti (email, password) VALUES (?, ?)`;
      db.run(queryInsert, [email, 'GOOGLE_AUTH_USER'], function (err) {
        if (err) {
          return response.status(500).json({ errore: 'Errore durante la registrazione dell\'utente con Google.' });
        }
        console.log(`Nuovo utente creato con successo tramite Google: ${email}`);
        return response.json({ messaggio: 'Utente creato con successo tramite Google!', email: email });
      }
      )
    };
  });
});



//route to retrieve the history of a specific user
app.get('/api/storico/', (request, response) => {
  const emailUtente = request.query.email;
  if (!emailUtente) {
    return response.status(400).json({ errore: 'Email dell\'utente mancante.' });
  }
  const query = `SELECT * FROM storico WHERE email_utente = ? ORDER BY data DESC`;
  db.all(query, [emailUtente], (err, rows) => {
    if (err) {
      return response.status(500).json({ errore: 'Errore durante il recupero dello storico.' });
    }
    response.json({ storico: rows });
  });
});

//start the server and listen for incoming requests
app.listen(PORT, () => {
  console.log(`Server effettuato con successo su http://localhost:${PORT}`);
});