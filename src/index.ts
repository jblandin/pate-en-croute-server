import express from 'express';
import http from 'http';
import socket, { Socket } from 'socket.io';
import createDebug from 'debug';
import * as moment from 'moment-ferie-fr';
import config from '../config/config.json';
import { Events, States, AppTimer, ConfigHeureMinute } from './models';

const app = express();
const server = http.createServer(app);
const io = socket(server);

const appLog = createDebug('app');
const appError = console.error;
appLog.log = console.log.bind(console);
appLog.enabled = true;

/*
 * CONSTANTES
 */


// Fonction de récupération du moment suivant l'horaire {heure: number, minute: number}
const getHeure = (hhmm: ConfigHeureMinute) => moment().startOf('day').hour(hhmm.heure).minute(hhmm.minute);

// Gestion du debug
const getDebug = (client: Socket) => appLog.extend(client.id);


const DUREE_CYCLE = getDureeCycleEnSecondes();

const appTimer = {
    state: States.INITIAL,
    timeleft: DUREE_CYCLE,
    timeleft_next: DUREE_CYCLE * 2
};

function getDureeCycleEnSecondes() {
    return (config.cycle.heures * 60 + config.cycle.minutes) * 60;
}

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
    io.emit(Events.APP_TIMER, appTimer);
    // Initialisation de l'intervalle
    interval = setInterval(() => {
        updateTimeleft(appTimer);
        io.emit(Events.APP_TIMER, appTimer);
        if (appTimer.timeleft <= 0 ){
            // Temps restant à 0 : c'est un mouvement
            appLog('MOUVEMENT');
            // On réinitialise le temps restant
            appTimer.timeleft = DUREE_CYCLE;
            appTimer.timeleft_next = DUREE_CYCLE * 2;
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
    if (appTimer.state !== States.RUNNING
        && appTimer.state !== States.PAUSED) {
        return;
    }

    clearInterval(interval);
    appTimer.state = States.STOPPED;
    appTimer.timeleft = DUREE_CYCLE;
    appTimer.timeleft_next = DUREE_CYCLE * 2;
    io.emit(Events.APP_TIMER, appTimer);
}

function initTimer(seconds: number) {
    if (appTimer.state !== States.STOPPED) {
        return;
    }
    if (isNaN(seconds)) {
        appError(`${seconds} n\'est pas un nombre valide`);
        return;
    }

    appTimer.state = States.INITIAL;
    appTimer.timeleft = seconds;
    appTimer.timeleft_next = seconds * 2;
    io.emit(Events.APP_TIMER, appTimer);
}

function updateTimeleft(appTmr: AppTimer) {
    // on décrémente uniquement si on est dans une période valide
    const aMoment = moment();
    if (isMomentValide(aMoment)) {
        appTmr.timeleft--;
        appTmr.timeleft_next--;
    }
}

/**
 * Retourne `true` si on est dans une période de travail :
 * - Entre le début et la fin d'une période de travail
 * - Un jour ouvré
 * @param {*} aMoment
 */
function isMomentValide(aMoment: any) {
    return isHeureDeTravail(aMoment)
        && aMoment.isWorkingDay()
}

function isHeureDeTravail(aMoment: any) {
    return config.journee.some((periode) => {
        const debut = getHeure(periode.debut);
        const fin = getHeure(periode.fin);
        return aMoment.isSameOrAfter(debut)
            && aMoment.isSameOrBefore(fin);
    });
}

function calculerDateMouvement(aMoment: any, duree: number) {
    // const periodes = config.journee.slice().sort((p1, p2) => p1.debut - p2.debut);

    /**
     * TODO
     *
     * On regarde si `aMoment` est dans une période de tavail ou de pause
     * Si période de travail :
     *  On calcule le temps avant la prochaine pause (`diff`)
     *  Si supérieur à la `durée`, on ajoute la `durée` à `aMoment` et on le retourne
     *  Sinon, on retranche `diff` de la `duree`, et on positionne `aMoment` à la fin de la pause
     *  Appel récursif
     * Si pas période de travail, si jour férié
     *  On positionne `aMoment` au jour suivant
     *  Appel récursif
     * Si pas période de travail, si pas jour férié
     *  On positionne `aMoment` à la prochaine heure de travail
     *  Appel récursif
     */
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

// Lancement du serveur
// startServer();

module.exports = {
    start: startServer
}