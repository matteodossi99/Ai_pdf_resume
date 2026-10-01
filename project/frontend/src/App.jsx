/*PER ESEGUIRE IL FRONT END:
cd frontend --> npm run dev
PER ESEGUIRE IL BACK END:
cd backend --> node server.js
*/
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode"; //library to read an email from a google token

function App() {

  const localStorageleLabel = 'emailUtente';
  const [modalitaRegistrazione, setModalitaRegistrazione] = useState(false);
  //handle authentication phase
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem(localStorageleLabel) ? true : false;
  });
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [emailUtenteLoggato, setEmailUtenteLoggato] = useState(() => {
    return localStorage.getItem(localStorageleLabel) || '';
  });
  const [analisiSelezionata, setAnalisiSelezionata] = useState(null);

  //handle change pages : (tab: 'analisi' o 'storico')
  const [tabCorrente, setTabCorrente] = useState('analisi');


  //handle AI analysis phase
  const [file, setFile] = useState(null);
  const [messaggio, setMessaggio] = useState('');
  const [analisiAI, setAnalisiAI] = useState('');
  const [caricamento, setCaricamento] = useState(false);
  const [copiato, setCopiato] = useState(false);
  const [storicoRichieste, setStoricoRichieste] = useState([]);
  const [erroreAuth, setErroreAuth] = useState('');
  const [messaggioLogin, setMessaggioLogin] = useState('');

  const gestisciInvioAutenticazione = async (e) => {
    e.preventDefault();

    if (!emailInput || !passwordInput) {
      setMessaggio('Per favore, inserisci sia email che password.');
      return;
    }

    const endpoint = modalitaRegistrazione ? 'http://127.0.0.1:3000/api/register' : 'http://127.0.0.1:3000/api/login';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
      });

      console.log("dati inviati ", JSON.stringify({ email: emailInput, password: passwordInput }))

      const dati = await response.json(); //catch the promise in a json format
      console.log("dati ricevuti ", dati);
      if (response.ok) {
        setMessaggio(`✅ ${dati.messaggio}`);
        localStorage.setItem(localStorageleLabel, emailInput);
        setIsLoggedIn(true);
        setEmailUtenteLoggato(emailInput);
        setTimeout(() => {
          setMessaggioLogin('');
        }, 1000);
      } else {
        setMessaggio(`❌ Errore: ${dati.errore}`);
        setErroreAuth(dati.errore)
      }
    } catch (error) {
      console.error('Errore durante la richiesta di autenticazione:', error);
      setMessaggio('Errore di connessione al server. Assicurati che il server sia attivo.');
      return;
    }
  };

  const mostraMessaggioTemporaneo = (testo) => {
    setMessaggio(testo);
    setTimeout(() => {
      setMessaggio('');
    }, 4000);
  };

  //manage file selection and reset AI analysis and copy state
  const gestisciSelezioneFile = (event) => {
    const fileSelezionato = event.target.files[0];
    if (fileSelezionato) {
      setFile(fileSelezionato);
      setMessaggio(`File pronto per l'analisi.`);
      setAnalisiAI('');
      setCopiato(false);
    }
  };

  //remove markdown formatting from the AI result text
  const pulisciTestoMarkdown = (testo) => {
    if (!testo) return '';
    return testo
      .replace(/#{1,6}\s?/g, '')       // Rimuove i cancelletti dei titoli (#)
      .replace(/\*\*/g, '')            // Rimuove i doppi asterischi del grassetto (**)
      .replace(/^\s*\*\s+/gm, '• ')    // Converte gli asterischi degli elenchi (anche se spaziati) in pallini (•)
      .replace(/\*/g, '');             // Rimuove qualsiasi altro asterisco singolo rimasto isolato
  };

  const copiaTesto = () => {
    navigator.clipboard.writeText(pulisciTestoMarkdown(analisiAI));
    setCopiato(true);
    setTimeout(() => setCopiato(false), 2500);
  };

  //load the history of the user from the server
  const caricaStorico = async () => {
    try {
      const response = await fetch(`http://127.0.0.1:3000/api/storico?email=${emailUtenteLoggato}`);
      const dati = await response.json();

      if (response.ok) {
        setStoricoRichieste(dati.storico);
      } else {
        console.error('Errore nel caricamento dello storico:', dati.errore);
      }
    } catch (error) {
      console.error('Errore di connessione durante il caricamento dello storico:', error);
    }
  };

  //send a file to server to analyze it with AI
  const gestisciInvio = async (event) => {
    event.preventDefault();

    if (!file) {
      setMessaggio('Per favore, seleziona prima un file PDF.');
      return;
    }

    const formData = new FormData(); //package of data send to the server
    formData.append('pdfFile', file);
    formData.append('email', emailUtenteLoggato);

    try {
      setCaricamento(true);
      setMessaggio('Analisi del documento con Intelligenza Artificiale in corso... Attendere.');
      setAnalisiAI('');

      const risposta = await fetch('http://127.0.0.1:3000/api/uploads/', {
        method: 'POST',
        body: formData,
      });

      const dati = await risposta.json();

      //analyze the server response and update the UI accordingly
      if (risposta.ok) {
        setMessaggio(`✅ ${dati.messaggio}`);
        setAnalisiAI(dati.risultato);
      } else {
        setMessaggio(`❌ Errore: ${dati.errore}`);
      }
    } catch (errore) {
      console.error(errore);
      setMessaggio('❌ Errore di connessione al server. Assicurati che il server sia attivo.');
    } finally {
      setCaricamento(false);
    }
  };

  //render the main application UI
  //login/registration page
  if (!isLoggedIn) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f9', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>
        <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', width: '100%', maxWidth: '400px', border: '1px solid #e1e4e8' }}>

          <h2 style={{ color: '#007BFF', textAlign: 'center', marginBottom: '8px', fontSize: '24px' }}> PDF Resume</h2>
          <p style={{ textAlign: 'center', color: '#666', fontSize: '14px', marginBottom: '25px' }}>
            {modalitaRegistrazione ? 'Crea un nuovo account' : 'Accedi per gestire i tuoi documenti'}
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '15px' }}>
            <GoogleLogin
              onSuccess={async credentialResponse => {

                console.log("Login con Google riuscito! Token:", credentialResponse.credential);
                //memorizzo l'email dell'utente loggato tramite Google nel nostro stato
                const datiUtente = jwtDecode(credentialResponse.credential);
                localStorage.setItem(localStorageleLabel, datiUtente.email);
                console.log("Email dell'utente:", datiUtente.email);
                setEmailUtenteLoggato(datiUtente.email);
                mostraMessaggioTemporaneo('✅ Login avvenuto con successo!');

                //send email to the server to register the user
                try {
                  await fetch('http://127.0.0.1:3000/api/google-login', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ email: datiUtente.email })
                  })

                } catch (error) {
                  console.error('Errore di comunicazione con il server', error);
                }
                setIsLoggedIn(true);
                setTimeout(() => {
                  setMessaggioLogin('');
                }, 1500);
              }}
              onError={() => {
                console.log('Login con Google fallito');
              }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', textAlign: 'center', margin: '20px 0', color: '#8c939d', fontSize: '13px' }}>
            <div style={{ flex: 1, borderBottom: '1px solid #e1e4e8' }}></div>
            <span style={{ padding: '0 10px' }}>oppure</span>
            <div style={{ flex: 1, borderBottom: '1px solid #e1e4e8' }}></div>
          </div>

          {/* MODULO EMAIL/PASSWORD */}
          <form onSubmit={gestisciInvioAutenticazione} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#495057' }}>Email</label>
              <input
                type="email"
                placeholder="tu@email.com"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                required
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '14px' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <label style={{ fontSize: '13px', fontWeight: '600', color: '#495057' }}>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                required
                style={{ padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '14px' }}
              />
            </div>

            {/* BOX FOR ERROR AUTHETICATION*/}
            {erroreAuth && (
              <div style={{ backgroundColor: '#f8d7da', color: '#721c24', padding: '12px 15px', borderRadius: '6px', border: '1px solid #f5c6cb', fontSize: '13px', marginBottom: '20px', textAlign: 'center', fontWeight: '500' }}>
                ⚠️ {erroreAuth}
              </div>
            )}

            <button
              type="submit"
              style={{ marginTop: '5px', padding: '11px', backgroundColor: '#007BFF', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '15px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {modalitaRegistrazione ? 'Registrati' : 'Accedi'}
            </button>
          </form>

          {/* link to swap between login and registration */}
          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: '#666' }}>
            {modalitaRegistrazione ? (
              <span>Hai già un account? <button onClick={() => { setModalitaRegistrazione(false); setErroreAuth(''); }} style={{ background: 'none', border: 'none', color: '#007BFF', cursor: 'pointer', fontWeight: '600', padding: 0 }}>Accedi</button></span>
            ) : (
              <span>Non hai un account? <button onClick={() => { setModalitaRegistrazione(true); setErroreAuth(''); }} style={{ background: 'none', border: 'none', color: '#007BFF', cursor: 'pointer', fontWeight: '600', padding: 0 }}>Registrati</button></span>
            )}
          </div>

        </div>
      </div>
    );
  }

  //DASHBOARD
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#f4f6f9', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', color: '#333' }}>

      <nav style={{ backgroundColor: '#ffffff', padding: '15px 30px', borderBottom: '1px solid #e1e4e8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
        <h2 style={{ margin: 0, color: '#007BFF', fontSize: '20px' }}>📄 AI PDF Dashboard</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <button
            onClick={() => { setTabCorrente('analisi'); setAnalisiSelezionata(null); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: tabCorrente === 'analisi' ? 'bold' : 'normal', color: tabCorrente === 'analisi' ? '#007BFF' : '#666', fontSize: '15px' }}
          >
            Analisi PDF
          </button>

          <button
            onClick={() => { setTabCorrente('storico'); setAnalisiSelezionata(null); caricaStorico(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: tabCorrente === 'storico' ? 'bold' : 'normal', color: tabCorrente === 'storico' ? '#007BFF' : '#666', fontSize: '15px' }}
          >
            Storico ({storicoRichieste.length})
          </button>

          <button
            onClick={() => {
              setAnalisiSelezionata('');
              localStorage.removeItem(localStorageleLabel);
              setEmailInput('');
              setPasswordInput('')
              setTabCorrente('analisi');
              setEmailUtenteLoggato('');
              setIsLoggedIn(false);
            }}
            style={{ backgroundColor: '#f8f9fa', border: '1px solid #ced4da', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', color: '#dc3545' }}
          >
            Log Out
          </button>
          {/*DA VERIFICARE*/}
          {messaggioLogin && (
            <div style={{ 
              backgroundColor: '#e8f4fd', 
              padding: '12px', 
              borderRadius: '6px', 
              border: '1px solid #bbe1fa', 
              color: '#0056b3', 
              fontSize: '14px', 
              textAlign: 'center', 
              marginBottom: '20px',
              animation: 'dissolvenzaVeloce 1.5s ease-in-out forwards' 
            }}>
              <strong>{messaggioLogin}</strong>
            </div>
          )}
        </div>
      </nav>

      <main style={{ flex: 1, padding: '40px 20px', maxWidth: '800px', width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>

        {tabCorrente === 'analisi' ? (
          <>
            <header style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h1 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '28px' }}>Analisi Intelligente dei Documenti</h1>
              <p style={{ color: '#666', fontSize: '15px' }}>Carica un documento PDF per generare un riassunto automatico tramite Google Gemini.</p>
            </header>

            <form onSubmit={gestisciInvio} style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '10px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '20px' }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ fontWeight: '600', fontSize: '14px', color: '#495057' }}>Seleziona documento PDF:</label>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={gestisciSelezioneFile}
                  style={{ padding: '10px', border: '1px solid #ced4da', borderRadius: '6px', backgroundColor: '#f8f9fa', cursor: 'pointer' }}
                />
              </div>

              {file && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#eef2f7', padding: '12px 15px', borderRadius: '6px', border: '1px solid #d1d9e0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '20px' }}>📄</span>
                    <div>
                      <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#2c3e50' }}>{file.name}</div>
                      <div style={{ fontSize: '12px', color: '#656d76' }}>Dimensione: {(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', backgroundColor: '#dcfce7', color: '#166534', padding: '4px 8px', borderRadius: '4px', fontWeight: '600' }}>Pronto</span>
                </div>
              )}

              <button
                type="submit"
                disabled={caricamento}
                style={{
                  padding: '12px',
                  cursor: caricamento ? 'not-allowed' : 'pointer',
                  backgroundColor: caricamento ? '#6c757d' : '#007BFF',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '10px'
                }}
              >
                {caricamento ? (
                  <>
                    <span style={{
                      width: '18px',
                      height: '18px',
                      border: '3px solid #ffffff',
                      borderTop: '3px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></span>
                    Elaborazione in corso...
                  </>
                ) : (
                  'Carica e Analizza con AI'
                )}
              </button>

            </form>

            {messaggio && (
              <div style={
                {
                  marginTop: '20px',
                  padding: '15px',
                  backgroundColor: '#e8f4fd',
                  borderRadius: '6px',
                  border: '1px solid #bbe1fa',
                  color: '#0056b3',
                  animation: 'dissolvenzaMessaggio 4s ease-in-out forwards'
                }}>
                <strong>{messaggio}</strong>
              </div>
            )}

            {analisiAI && (
              <div style={{ marginTop: '25px', padding: '30px', backgroundColor: '#ffffff', borderRadius: '10px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #007BFF', paddingBottom: '10px', marginBottom: '15px' }}>
                  <h3 style={{ color: '#2c3e50', margin: 0, fontSize: '18px' }}>
                    Risultato dell'Analisi AI:
                  </h3>

                  <button
                    onClick={copiaTesto}
                    style={{
                      backgroundColor: copiato ? '#28a745' : '#f8f9fa',
                      color: copiato ? '#ffffff' : '#495057',
                      border: '1px solid #ced4da',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: '600'
                    }}
                  >
                    {copiato ? 'Copiato!' : 'Copia Testo'}
                  </button>
                </div>

                <div style={{ textAlign: 'left', whiteSpace: 'pre-line', lineHeight: '1.8', fontSize: '15px', color: '#4a5568' }}>
                  {pulisciTestoMarkdown(analisiAI)}
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            {analisiSelezionata ? (
              <div style={{ backgroundColor: '#ffffff', padding: '30px', borderRadius: '10px', border: '1px solid #e1e4e8', boxShadow: '0 4px 6px rgba(0,0,0,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #007BFF', paddingBottom: '10px', marginBottom: '20px' }}>
                  <div>
                    <h3 style={{ color: '#2c3e50', margin: '0 0 5px 0', fontSize: '18px' }}>
                      📄 {analisiSelezionata.nome_file || analisiSelezionata.nomeFile}
                    </h3>
                    <span style={{ fontSize: '12px', color: '#6c757d' }}>Data analisi: {analisiSelezionata.data}</span>
                  </div>
                  <button
                    onClick={() => setAnalisiSelezionata(null)}
                    style={{ backgroundColor: '#f8f9fa', color: '#495057', border: '1px solid #ced4da', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}
                  >
                    ← Torna allo Storico
                  </button>
                </div>

                <div style={{ textAlign: 'left', whiteSpace: 'pre-line', lineHeight: '1.8', fontSize: '15px', color: '#4a5568' }}>
                  {pulisciTestoMarkdown(analisiSelezionata.sintesi)}
                </div>
              </div>
            ) : (
              //list of historic analyses
              <>
                <h2 style={{ color: '#2c3e50', marginBottom: '20px' }}>Storico delle Analisi</h2>
                {storicoRichieste.length === 0 ? (
                  <p style={{ color: '#666' }}>Nessuna analisi effettuata di recente.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {storicoRichieste.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setAnalisiSelezionata(item)}
                        style={{
                          backgroundColor: '#ffffff',
                          padding: '20px',
                          borderRadius: '8px',
                          border: '1px solid #e1e4e8',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.borderColor = '#007BFF'}
                        onMouseLeave={(e) => e.currentTarget.style.borderColor = '#e1e4e8'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: '#007BFF', fontSize: '16px' }}>
                            📄 {item.nome_file || item.nomeFile}
                          </strong>
                          <span style={{ fontSize: '12px', color: '#6c757d' }}>{item.data}</span>
                        </div>
                        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#6c757d' }}>
                          Clicca per visualizzare il riassunto completo...
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}

      </main>

      <footer style={{ backgroundColor: '#ffffff', padding: '20px', textAlign: 'center', borderTop: '1px solid #e1e4e8', color: '#6c757d', fontSize: '14px' }}>
        <p style={{ margin: 0 }}>Sviluppato con React, Node.js e Google Gemini API</p>
      </footer>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
          @keyframes dissolvenzaMessaggio {
          0% { opacity: 0; transform: translateY(-5px); }
          15% { opacity: 1; transform: translateY(0); }
          75% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }

        @keyframes dissolvenzaVeloce {
          0% { opacity: 0; transform: translateY(-5px); }
          25% { opacity: 1; transform: translateY(0); }
          70% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

export default App;