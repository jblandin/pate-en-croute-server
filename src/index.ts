import createDebug from 'debug';
import express from 'express';
import http from 'http';
import moment, { Moment } from 'moment-ferie-fr';
import socket, { Socket } from 'socket.io';

import config from '../config/config.json';
import { AppTimer, Events, States } from './models';
import { calculerDateMouvement, calculerTempsRestantAvantDateDonnee, getDureeCycleEnSecondes, isMomentValide } from './calcul-date';

const app = express();
const server = http.createServer(app);
const io = socket(server);

const appLog = createDebug('app');
const appError = console.error;
appLog.log = console.log.bind(console);
appLog.enabled = true;

moment.locale('fr');

// Gestion du debug
const getDebug = (client: Socket) => appLog.extend(client.id);

const DUREE_CYCLE = getDureeCycleEnSecondes(config.cycle);

const appTimer: AppTimer = {
    state: States.INITIAL,
    timeleft: DUREE_CYCLE,
    timeleft_next: DUREE_CYCLE * 2,
    duration: DUREE_CYCLE,
    date_move: undefined,
    date_move_iso: undefined,
    date_move_next: undefined,
    date_move_next_iso: undefined,
    isPauseAutomatique: false
};

/**
 * TODO : Vérifier que les intervalles sont cohérents (pas de chevauchement)
 */

let interval: NodeJS.Timeout;

function initConnection(client: Socket) {
    const debug = getDebug(client);
    debug('Connexion');

    client.on('disconnect', () => debug('Déconnexion'));

    client.emit(Events.APP_TIMER, appTimer);

    // Events
    client.on(Events.START, onStart);
    client.on(Events.STOP, onStop);
    client.on(Events.PAUSE, onPause);
    client.on(Events.INIT, onInit);

    // Callbacks
    function onStart(data: any) {
        debug('onStart', data);
        startTimer();
    }

    function onStop(data: any) {
        debug('onStop', data);
        stopTimer();
    }

    function onPause(data: any) {
        debug('onPause', data);
        pauseTimer();
    }

    function onInit(data: any) {
        debug('onInit', data);
        initTimer(data);
    }
}

function startTimer() {
    if (appTimer.state === States.RUNNING) {
        return;
    }

    appTimer.state = States.RUNNING;

    let m = calculerDateMouvement(moment(), appTimer.timeleft, config.journee);
    appTimer.date_move_iso = m.format();
    appTimer.date_move = m.format('dddd DD MMMM HH:mm:ss');

    m = calculerDateMouvement(moment(), appTimer.timeleft_next, config.journee);
    appTimer.date_move_next_iso = m.format();
    appTimer.date_move_next = m.format('dddd DD MMMM HH:mm:ss');

    appLog('start timer : ', appTimer.date_move);
    io.emit(Events.APP_TIMER, appTimer);
    // Initialisation de l'intervalle
    interval = setInterval(() => {
        updateTimeleft(appTimer, moment());
        io.emit(Events.APP_TIMER, appTimer);
        if (appTimer.timeleft <= 0) {
            // Temps restant à 0 : c'est un mouvement
            appLog('MOUVEMENT');
            // On réinitialise le temps restant
            appTimer.timeleft = DUREE_CYCLE;
            appTimer.timeleft_next = DUREE_CYCLE * 2;

            m = calculerDateMouvement(moment(), appTimer.timeleft, config.journee);
            appTimer.date_move_iso = m.format();
            appTimer.date_move = m.format('dddd DD MMMM HH:mm:ss');

            m = calculerDateMouvement(moment(), appTimer.timeleft_next, config.journee);
            appTimer.date_move_next_iso = m.format();
            appTimer.date_move_next = m.format('dddd DD MMMM HH:mm:ss');

            io.emit(Events.MOUVEMENT, appTimer);
        }
    }, 1000);
}

function pauseTimer() {
    if (appTimer.state !== States.RUNNING) {
        return;
    }

    clearInterval(interval);
    appTimer.state = States.PAUSED;
    io.emit(Events.APP_TIMER, appTimer);
}

function stopTimer() {
    if (appTimer.state !== States.RUNNING && appTimer.state !== States.PAUSED) {
        return;
    }

    clearInterval(interval);
    appTimer.state = States.STOPPED;
    appTimer.timeleft = DUREE_CYCLE;
    appTimer.timeleft_next = DUREE_CYCLE * 2;
    io.emit(Events.APP_TIMER, appTimer);
}

function initTimer(seconds: number) {
    if (appTimer.state !== States.STOPPED
        && appTimer.state !== States.INITIAL) {
        return;
    }
    if (isNaN(seconds)) {
        appError(`${seconds} n\'est pas un nombre valide`);
        return;
    }

    appTimer.state = States.INITIAL;
    appTimer.timeleft = seconds;
    appTimer.timeleft_next = DUREE_CYCLE + seconds;

    let m = calculerDateMouvement(moment(), appTimer.timeleft, config.journee);
    appTimer.date_move_iso = m.format();
    appTimer.date_move = m.format('dddd DD MMMM HH:mm:ss');

    m = calculerDateMouvement(moment(), appTimer.timeleft_next, config.journee);
    appTimer.date_move_next_iso = m.format();
    appTimer.date_move_next = m.format('dddd DD MMMM HH:mm:ss');

    io.emit(Events.APP_TIMER, appTimer);
}

function updateTimeleft(appTmr: AppTimer, aMoment: Moment) {
    // on décrémente uniquement si on est dans une période valide
    if (isMomentValide(aMoment, config.journee)) {
        appTmr.isPauseAutomatique = false;
        appTmr.timeleft--;
        appTmr.timeleft_next--;
        if (appTmr.timeleft % 60 === 0) {
            const mMove = moment(appTimer.date_move_iso);
            const tl = calculerTempsRestantAvantDateDonnee(aMoment, mMove, config.journee);
            appTmr.timeleft = Math.round(tl);

            const mMoveNext = moment(appTimer.date_move_next_iso);
            const tln = calculerTempsRestantAvantDateDonnee(aMoment, mMoveNext, config.journee);
            appTmr.timeleft_next = Math.round(tln);
        }
    } else {
        appTmr.isPauseAutomatique = true;
    }
}

/**
 * SERVEUR
 */
function startServer() {
    server.listen(config.app.port, () => {
        appLog(`Serveur démarré sur le port ${config.app.port}`);
        appLog('Configuration : %O', config);
    });

    io.on('connection', initConnection);
}

module.exports = {
    start: startServer
};
