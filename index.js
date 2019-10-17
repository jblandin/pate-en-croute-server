const app = require("express")();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
const createDebug = require("debug");
const moment = require('moment');
const config = require("./config.json");

const appLog = createDebug('app');
const appError = console.error;
appLog.log = console.log.bind(console);
appLog.enabled = true;

/*
 * CONSTANTES
 */

const events = {
    START: "start",
    STOP: "stop",
    PAUSE: "pause",
    INIT: "init",
    MOUVEMENT: "mouvement",
    APP_TIMER: "app-timer"
};

const states = {
    INITIAL: "initial",
    RUNNING: "running",
    PAUSED: "paused",
    STOPPED: "stopped"
};

const DUREE_CYCLE = getDureeCycleEnSecondes();

const appTimer = {
    state: states.INITIAL,
    timeleft: DUREE_CYCLE
};

function getDureeCycleEnSecondes() {
    return (config.cycle.heures * 60 + config.cycle.minutes) * 60;
}

/**
 *
 */

let interval;

function initConnection(client) {
    const debug = getDebug(client);
    debug("Connexion");

    client.on("disconnect", () => debug("Déconnexion"));

    client.emit(events.APP_TIMER, appTimer);

    // Events
    client.on(events.START, onStart);
    client.on(events.STOP, onStop);
    client.on(events.PAUSE, onPause);
    client.on(events.INIT, onInit);

    // Callbacks
    function onStart(data) {
        debug("onStart", data);
        startTimer();
    }

    function onStop(data) {
        debug("onStop", data);
        stopTimer();
    }

    function onPause(data) {
        debug("onPause", data);
        pauseTimer();
    }

    function onInit(data) {
        debug("onInit", data);
        initTimer(data);
    }
}


function startTimer() {
    if (appTimer.state === states.RUNNING) {
        return;
    }

    appTimer.state = states.RUNNING;
    io.emit(events.APP_TIMER, appTimer);
    // Initialisation de l'intervalle
    interval = setInterval(() => {
        updateTimeleft(appTimer);
        io.emit(events.APP_TIMER, appTimer);
        if (appTimer.timeleft <= 0 ){
            // Temps restant à 0 : c'est un mouvement
            appLog('MOUVEMENT');
            // On réinitialise le temps restant
            appTimer.timeleft = DUREE_CYCLE;
            io.emit(events.MOUVEMENT, appTimer);
        }
    }, 1000);
}

function pauseTimer() {
    if (appTimer.state !== states.RUNNING) {
        return;
    }

    clearInterval(interval);
    appTimer.state = states.PAUSED;
    io.emit(events.APP_TIMER, appTimer);
}

function stopTimer() {
    if (appTimer.state !== states.RUNNING
        && appTimer.state !== states.PAUSED) {
        return;
    }

    clearInterval(interval);
    appTimer.state = states.STOPPED;
    appTimer.timeleft = DUREE_CYCLE;
    io.emit(events.APP_TIMER, appTimer);
}

function initTimer(seconds) {
    if (appTimer.state !== states.STOPPED) {
        return;
    }
    if(isNaN(seconds)) {
        appError(`${seconds} n\'est pas un nombre valide`);
        return;
    }

    appTimer.state = states.INITIAL;
    appTimer.timeleft = seconds;
    io.emit(events.APP_TIMER, appTimer);
}

function updateTimeleft(appTimer) {
    // on décrémente uniquement si on est dans une période valide
    const aMoment = moment();
    if (isMomentValide(aMoment)) {
        appTimer.timeleft--;
    }
}

/**
 * Retourne `true` si on est dans une période de travail :
 * - Entre le début et la fin de journée
 * - Un jour ouvré
 * @param {*} aMoment
 */
function isMomentValide(aMoment) {
    const debutJournee = getHeure(config.journee.debut);
    const finJournee = getHeure(config.journee.fin);

    return aMoment.isSameOrAfter(debutJournee)  // Début de journée
    && aMoment.isSameOrBefore(finJournee)       // Fin de journée
    && aMoment.day() !== 6                      // Samedi
    && aMoment.day() !== 0                      // Dimanche
}


// Fonction de récupération du moment suivant l'horaire {heure: number, minute: number}
const getHeure = hhmm => moment().startOf('day').hour(hhmm.heure).minute(hhmm.minute);

// Gestion du debug
const getDebug = client => appLog.extend(client.id);

/**
 * SERVEUR
 */
function startServer() {
    server.listen(config.app.port, () => {
        appLog(`Serveur démarré sur le port ${config.app.port}`);
        appLog('Configuration : %O', config);
    });

    io.on("connection", initConnection);
}

// Lancement du serveur
startServer();