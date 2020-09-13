import moment, { Moment } from 'moment-ferie-fr';
import { AppTimer, States, Config, AppTimerCallbackFn } from '../models';
import { getDureeCycleEnSecondes, calculerDateMouvement, isMomentValide, calculerTempsRestantAvantDateDonnee } from '../calcul-date';

const appError = console.error;

// Fréquence de calibrage, en secondes
const CALIBRAGE_FREQ = 60;

export class Sandglass {
    private appTimer: AppTimer;
    private config: Config;
    private dureeCycle: number;
    private intervalle: NodeJS.Timeout;

    constructor(config: Config) {
        moment.locale('fr');
        this.config = config;
        this.dureeCycle  = getDureeCycleEnSecondes(this.config.cycle);
        this.appTimer =  {
            state: States.INITIAL,
            timeleft: this.dureeCycle,
            timeleft_next: this.dureeCycle * 2,
            duration: this.dureeCycle,
            date_move: undefined,
            date_move_iso: undefined,
            date_move_next: undefined,
            date_move_next_iso: undefined,
            isPauseAutomatique: false
        };
    }

    /**
     * Retourn le appTimer
     */
    getTimer(): AppTimer {
        return this.appTimer;
    }

    /**
     * Retourne le temps restant entre un moment et une date
     */
    private _calculerTempsRestant(aMoment: Moment, date: string): number {
        const mMove = moment(date);
        const tl = calculerTempsRestantAvantDateDonnee(aMoment, mMove, this.config.journee, this.config.allDaysValides);
        return Math.round(tl);
    }

    /**
     * Recalcule les temps restants du moment suivant et de celui d'après,
     * afin d'éviter d'avoir un décalage dû à l'imprecision de `setInterval`
     */
    private _recalibrerTempsRestant(at: AppTimer, m: Moment) {
        if (at.timeleft % CALIBRAGE_FREQ === 0) {
            at.timeleft = this._calculerTempsRestant(m, at.date_move_iso);
            at.timeleft_next = this._calculerTempsRestant(m, at.date_move_next_iso);
        }
    }

    /**
     * Mise à jour du appTimer, en fonction du moment donné
     */
    private _updateTimeleft(at: AppTimer, aMoment: Moment) {
        // on décrémente uniquement si on est dans une période valide
        if (!isMomentValide(aMoment, this.config.journee, this.config.allDaysValides)) {
            at.isPauseAutomatique = true;
            return;
        }

        at.isPauseAutomatique = false;
        at.timeleft--;
        at.timeleft_next--;

        this._recalibrerTempsRestant(at, aMoment);
    }

    /**
     * Mise à jour de la date du prochain mouvement et le suivant,
     * en fonction du temps restant
     */
    private _updateDateMouvement(at: AppTimer) {
        const m = calculerDateMouvement(moment(), at.timeleft, this.config.journee, this.config.allDaysValides);
        at.date_move_iso = m.format();
        at.date_move = m.format('dddd DD MMMM HH:mm:ss');

        const mNxt = calculerDateMouvement(moment(), at.timeleft_next, this.config.journee, this.config.allDaysValides);
        at.date_move_next_iso = mNxt.format();
        at.date_move_next = mNxt.format('dddd DD MMMM HH:mm:ss');
    }

    /**
     * Initialise les temps restant des deux prochains mouvement,
     * la durée avant le premier peut être donnée
     */
    private _initTimeLeft(at: AppTimer, dureeRestante?: number) {
        at.timeleft = dureeRestante || this.dureeCycle;
        at.timeleft_next = at.timeleft + this.dureeCycle;
    }

    /**
     * Démarre le timer
     */
    startTimer(cb: AppTimerCallbackFn, cbMouvement: AppTimerCallbackFn) {
        if (this.appTimer.state === States.RUNNING) {
            return;
        }

        this.appTimer.state = States.RUNNING;

        this._updateDateMouvement(this.appTimer);

        cb(this.appTimer);

        // Initialisation de l'intervalle
        this.intervalle = setInterval(() => {
            this._updateTimeleft(this.appTimer, moment());
            cb(this.appTimer);
            /*
            if (this.appTimer.timeleft <= 0) {
                // Temps restant à 0 : c'est un mouvement
                // On réinitialise le temps restant
                this._initTimeLeft(this.appTimer);
                this._updateDateMouvement(this.appTimer);

                cbMouvement(this.appTimer);
            }
            */
        }, 1000);
    }

    /**
     * Met le timer en pause
     */
    pauseTimer(cb: AppTimerCallbackFn) {
        if (this.appTimer.state !== States.RUNNING) {
            return;
        }

        clearInterval(this.intervalle);
        this.appTimer.state = States.PAUSED;
        cb(this.appTimer);
    }


    /**
     * Arrête le timer
     */
    stopTimer(cb: AppTimerCallbackFn) {
        if (this.appTimer.state !== States.RUNNING && this.appTimer.state !== States.PAUSED) {
            return;
        }

        clearInterval(this.intervalle);
        this.appTimer.state = States.STOPPED;
        this._initTimeLeft(this.appTimer);
        cb(this.appTimer);
    }

    /**
     * Initialise le timer à un temps restant donné
     */
    initTimer(seconds: number, cb: AppTimerCallbackFn) {
        if (this.appTimer.state !== States.STOPPED
            && this.appTimer.state !== States.INITIAL) {
            return;
        }
        if (isNaN(seconds)) {
            appError(`${seconds} n\'est pas un nombre valide`);
            return;
        }

        this.appTimer.state = States.INITIAL;
        this._initTimeLeft(this.appTimer, seconds);
        this._updateDateMouvement(this.appTimer);

        cb(this.appTimer);
    }
}
