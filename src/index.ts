/**
 *
 */

// Utile pour les logs de la config
process.env.DEBUG_DEPTH = '10';

import createDebug from 'debug';
import express from 'express';
import http from 'http';
import socket, { Socket } from 'socket.io';

import { AppTimer, Events } from './models';
import { Timer } from './timer';

import config from '../config/config.json';
import { Sandglass } from './sandglass/sandglass.service';

const app = express();
const server = http.createServer(app);
const io = socket(server);

// Initialisation des logs de l'application
const appLog = createDebug('app');
appLog.log = console.log.bind(console);
appLog.enabled = true;

// Gestion du debug
const getDebug = (client: Socket) => appLog.extend(client.id);

// Initialisation du timer
// const timer = new Timer(config);
const timer = new Sandglass(config);

// Callbacks envoyés au timer
const emmitAppTimerEvt = (at: AppTimer) => {
    io.emit(Events.APP_TIMER, at);
    appLog('start timer : ', at.date_move);
};

const emmitMouvementEvt = (at: AppTimer) => {
    io.emit(Events.MOUVEMENT, at);
    appLog('MOUVEMENT');
};

// Fonction lancée lorsqu'un client se connecte
function initConnection(client: Socket) {
    const debug = getDebug(client);
    debug('Connexion');

    client.on('disconnect', () => debug('Déconnexion'));

    client.emit(Events.APP_TIMER, timer.getTimer());

    // Events
    client.on(Events.START, onStart);
    client.on(Events.STOP, onStop);
    client.on(Events.PAUSE, onPause);
    client.on(Events.INIT, onInit);

    // Callbacks envoyés au client
    function onStart(data: any) {
        debug('onStart', data);
        timer.startTimer(emmitAppTimerEvt, emmitMouvementEvt);
    }

    function onStop(data: any) {
        debug('onStop', data);
        timer.stopTimer(emmitAppTimerEvt);
    }

    function onPause(data: any) {
        debug('onPause', data);
        timer.pauseTimer(emmitAppTimerEvt);
    }

    function onInit(data: any) {
        debug('onInit', data);
        timer.initTimer(data, emmitAppTimerEvt);
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
