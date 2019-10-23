// Augmentation de Moment avec les fonctions de moment-ferie-fr
import moment = require('moment');

export = moment;

declare module 'moment' {
    interface Moment {
        paques(Y?: number): Moment;
        lundiDePaques(Y?: number): Moment;
        ascension(Y?: number): Moment;
        pentecote(Y?: number): Moment;
        jourDeLAn(Y?: number): Moment;
        feteDuTravail(Y?: number): Moment;
        victoireDeAllies(Y?: number): Moment;
        feteNationale(Y?: number): Moment;
        assomption(Y?: number): Moment;
        toussaint(Y?: number): Moment;
        armistice(Y?: number): Moment;
        noel(Y?: number): Moment;

        getFerieList(Y?: number): Array<{name: string, date: Moment}>;
        getFerie(): Moment;

        isFerie(): boolean;
        isWeekEnd(): boolean;
        isWorkingDay(): boolean;
    }
}
