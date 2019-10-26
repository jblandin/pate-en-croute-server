import createDebug from 'debug';
import express from 'express';
import http from 'http';
import moment, { Moment, Duration } from 'moment-ferie-fr';
import socket, { Socket } from 'socket.io';

import config from '../config/config.json';
import { AppTimer, ConfigHeureMinute, Events, States, ConfigIntervalle } from './models';

const app = express();
const server = http.createServer(app);
const io = socket(server);

const appLog = createDebug('app');
const appError = console.error;
appLog.log = console.log.bind(console);
appLog.enabled = true;

moment.locale('fr');
/*
 * CONSTANTES
 */

// Fonction de récupération du moment suivant l'horaire {heure: number, minute: number}
const getHeure = (hhmm: ConfigHeureMinute, aMoment: Moment) =>
    aMoment.clone()
        .startOf('day')
        .hour(hhmm.heure)
        .minute(hhmm.minute)
        .second(0);

// Gestion du debug
const getDebug = (client: Socket) => appLog.extend(client.id);

const DUREE_CYCLE = getDureeCycleEnSecondes();

const appTimer: AppTimer = {
    state: States.INITIAL,
    timeleft: DUREE_CYCLE,
    timeleft_next: DUREE_CYCLE * 2,
    duration: DUREE_CYCLE,
    date_move: undefined,
    date_move_next: undefined
};

function getDureeCycleEnSecondes() {
    return (config.cycle.heures * 60 + config.cycle.minutes) * 60 + config.cycle.secondes;
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
    appTimer.date_move = calculerDateMouvement(moment(), appTimer.timeleft, config.journee).format('dddd DD MMMM HH:mm:ss');
    appTimer.date_move_next = calculerDateMouvement(moment(), appTimer.timeleft_next, config.journee).format('dddd DD MMMM HH:mm:ss');
    appLog('start timer : ', appTimer.date_move);
    io.emit(Events.APP_TIMER, appTimer);
    // Initialisation de l'intervalle
    interval = setInterval(() => {
        updateTimeleft(appTimer);
        io.emit(Events.APP_TIMER, appTimer);
        if (appTimer.timeleft <= 0) {
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
 */
function isMomentValide(aMoment: Moment) {
    return isHeureDeTravail(aMoment) && aMoment.isWorkingDay();
}

function isHeureDeTravail(aMoment: Moment) {
    return config.journee.some(periode => {
        const debut = getHeure(periode.debut, aMoment);
        const fin = getHeure(periode.fin, aMoment);
        return aMoment.isSameOrAfter(debut) && aMoment.isSameOrBefore(fin);
    });
}

function getSortedPeriodes(periodes: Array<ConfigIntervalle>): Array<ConfigIntervalle> {
    return periodes
        .slice()
        .sort((p1, p2) => {
            const diffHeures = p1.debut.heure - p2.debut.heure;
            const diffMinutes = p1.debut.minute - p2.debut.minute;
            if (diffHeures === 0) {
                return diffMinutes;
            } else {
                return diffHeures;
            }
        });
}

export function getPeriodeDeTravail(m: Moment, periodesDeTravail: ConfigIntervalle[]): ConfigIntervalle {
    const inters = periodesDeTravail.filter((intervalle) => {
        const debut = getHeure(intervalle.debut, m);
        const fin = getHeure(intervalle.fin, m);
        return m.isSameOrAfter(debut) && m.isBefore(fin);
    });
    if (inters.length === 1) {
        return inters[0];
    } else {
        return undefined;
    }
}

export function getDureeAvantReprise(m: Moment, periodesDeTravail: ConfigIntervalle[]): Duration {
    let duration: Duration;
    periodesDeTravail.forEach(intervalle => {
        if (!duration) {
            const debut = getHeure(intervalle.debut, m);
            if (m.isBefore(debut)) {
                duration = moment.duration(debut.diff(m));
            }

        }
    });

    if (!duration) {
        // Il n'y a plus de période de travail sur cette journée
        // On positionne le moment sur la journée suivante au debut
        // du premier intervalle
        const newM = getHeure(periodesDeTravail[0].debut, m.clone().add(1, 'd'));
        duration = moment.duration(newM.diff(m));
    }

    return duration;
}

export function calculerDateMouvement(aMoment: Moment, duree: number, journee: ConfigIntervalle[]): Moment {
    if (!journee || !journee.length) {
        throw new Error('Erreur de configuration de "journee" : non défini ou vide');
    }
    const m = aMoment.clone();
    // console.log('moment : ', m, 'durée : ', moment.duration(duree, 's').humanize());
    if (!m.isWorkingDay()) {
        m.add(1, 'd').startOf('day');
        return calculerDateMouvement(m, duree, journee);
    }

    const periodesDeTravail = getSortedPeriodes(journee);
    const intervalle = getPeriodeDeTravail(m, periodesDeTravail);

    if (intervalle) {
        const dureeAvantPause = moment.duration(getHeure(intervalle.fin, m).diff(m));
        if (dureeAvantPause.asSeconds() > duree) {
            // Prochain mouvement avant la prochaine pause
            return m.add(duree, 's');
        } else {
            // On ajoute le temps restant avant la pause,
            // et on diminue le temps restant d'autant
            m.add(dureeAvantPause);
            const dureeRestante = duree - dureeAvantPause.asSeconds();
            return calculerDateMouvement(m, dureeRestante, journee);
        }
    } else {
        // On calcule la durée restante de la pause
        const dureeAvantReprise = getDureeAvantReprise(m, periodesDeTravail);
        // Et on se positionne à la fin de la pause
        m.add(dureeAvantReprise);
        // console.log('fin de pause : ', m);
        return calculerDateMouvement(m, duree, journee);
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

// Lancement du serveur
// startServer();

module.exports = {
    start: startServer,
    calculerDateMouvement,
    getPeriodeDeTravail,
    getDureeAvantReprise
};
