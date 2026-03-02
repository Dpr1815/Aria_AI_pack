import type { AppLabels } from "../types";
import { en } from "./en";

export const it: AppLabels = {
  /* Non-room namespaces fall back to English until translated */
  common: en.common,
  auth: en.auth,
  layout: en.layout,
  agent: en.agent,
  organization: en.organization,

  /* Room labels — existing Italian translations */
  room: {
    interviewModal: {
      previewMode: "Anteprima",
      readyToBegin: "Intervista",
      draftMode: "Modalità Bozza",
      draftModeMessage:
        "Solo i creatori della campagna possono avviare interviste in modalità bozza.",
      loggedInAs: "Accesso effettuato come",
      fullName: "Nome Completo",
      fullNamePlaceholder: "Inserisci il tuo nome completo",
      emailAddress: "Indirizzo Email",
      emailPlaceholder: "Inserisci il tuo indirizzo email",
      emailHelp: "Invieremo il tuo report a questo indirizzo email",
      startInterview: "Inizia Intervista",
      webcamNotice: "L'intervista sarà registrata.",
      termsText: "Continuando, accetti i nostri",
      termsLink: "Termini di Servizio",
      and: "e la",
      privacyLink: "Privacy Policy",
      errorCreate: "Impossibile creare l'intervista. Riprova.",
      errorAuth: "Autenticazione fallita. Riprova.",
      creatingInterview: "Un momento",
      agentNotActive: "Questo agente non è attualmente attivo.",
      invalidEmail: "Inserisci un indirizzo email valido.",
    },
    tutorial: {
      header: {
        welcome: "Benvenuto alla tua Intervista",
        subtitle: "Una guida rapida prima di iniziare",
      },
      deviceSetup: {
        title: "Configurazione Dispositivo",
        subtitle:
          "Configuriamo la tua fotocamera e il microfono per l'intervista.",
      },
      recording: {
        title: "Interazione Vocale",
        description:
          "Tieni premuto il pulsante del microfono per parlare con l'intervistatore AI. Rilascia quando hai finito.",
      },
      chat: {
        title: "Cronologia Chat",
        description:
          "Clicca l'icona della chat per visualizzare la cronologia della conversazione.",
      },
      reports: {
        title: "Report dell'Intervista",
        description:
          "Al termine dell'intervista, riceverai un report generato dall'AI.",
        footer: "Rivedi le tue prestazioni",
      },
      card: {
        howToUse: "Come usare",
        pressHoldToSpeak: "Tieni premuto per parlare",
        voiceTranscribed:
          "La tua voce verrà trascritta e inviata all'intervistatore AI",
        clickViewChat: "Clicca per vedere la cronologia chat",
        finalStep: "Ultimo Passo",
      },
      buttons: {
        back: "Indietro",
        next: "Avanti",
        tutorial: "Continua",
        startInterview: "Inizia Intervista",
      },
      /* New tutorial keys — fall back to English until translated */
      permissions: en.room.tutorial.permissions,
      chatExample1: en.room.tutorial.chatExample1,
      chatExample2: en.room.tutorial.chatExample2,
      interviewReport: en.room.tutorial.interviewReport,
      strengths: en.room.tutorial.strengths,
    },
    room: {
      confirmTitle: "Conferma Creazione Report",
      confirmMessage:
        "Creare il report adesso? Se procedi, l'intervista terminerà e il report verrà generato con i dati raccolti finora.",
      cancel: "Annulla",
      confirmSubmit: "Conferma Invio",
      createReport: "Crea Report",
      creatingReport: "Creazione Report...",
      chat: "Chat",
    },
    /* New room keys — fall back to English until translated */
    speechControls: en.room.speechControls,
    testModal: en.room.testModal,
    loadingMessages: en.room.loadingMessages,
    conclusion: en.room.conclusion,
    agentNotFound: en.room.agentNotFound,
    agentNotFoundSub: en.room.agentNotFoundSub,
    speechTip:
      "Tieni premuto il pulsante per registrare. Rilascia il pulsante quando hai finito di parlare.",
    warningWait: "Attendi che l'AI finisca di parlare.",
    errorGeneric: "Qualcosa è andato storto. Riprova.",
    conclusionTitle: "Intervista Completata",
    conclusionMessage:
      "Grazie per aver completato l'intervista. Il tuo report verrà generato a breve.",
  },
};
