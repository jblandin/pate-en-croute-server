/**
 * Librairie de calcul et manipulation de dates
 */
import { ConfigHeureMinute, ConfigIntervalle, ConfigCycle } from '../models';
import moment, { Moment, Duration } from 'moment-ferie-fr';


/**
 * Retourne un nouveau moment pour l'horaire donné
 */
export function getMomentPourHeureMinute(hhmm: ConfigHeureMinute, aMoment: Moment): Moment {
    return aMoment.clone()
        .startOf('day')
        .hour(hhmm.heure)
        .minute(hhmm.minute)
        .second(0);
}

/**
 * Retourne la durée d'un cycle en secondes
 */
export function getDureeCycleEnSecondes(cycle: ConfigCycle): number {
    return (cycle.heures * 60 + cycle.minutes) * 60 + cycle.secondes;
}

/**
 * Compare deux périodes en fonction de l'heure de début
 */
function _comparePeriodes(p1: ConfigIntervalle, p2: ConfigIntervalle): number {
    const diffHeures = p1.debut.heure - p2.debut.heure;
    const diffMinutes = p1.debut.minute - p2.debut.minute;
    if (diffHeures === 0) {
        return diffMinutes;
    } else {
        return diffHeures;
    }
}

/**
 * Trie une liste de périodes en fonction de l'heure de début
 */
export function getPeriodesTriees(periodes: Array<ConfigIntervalle>): Array<ConfigIntervalle> {
    return periodes
        .slice()
        .sort(_comparePeriodes);
}

/**
 * Retourne une fonction pour un moment donné,
 * qui retourne `true` si le moment est dans un intervalle donné
 */
function _isMomentDansIntervalleFn(m: Moment) {
    return (intervalle: ConfigIntervalle) => {
        const debut = getMomentPourHeureMinute(intervalle.debut, m);
        const fin = getMomentPourHeureMinute(intervalle.fin, m);
        return m.isSameOrAfter(debut) && m.isBefore(fin);
    };
}
/**
 * Retourne l'intervalle dans lequel se trouve le moment, `undefined` si aucun intervalle trouvé
 */
export function findPeriodeDeTravail(m: Moment, periodesDeTravail: ConfigIntervalle[]): ConfigIntervalle {
    const inters = periodesDeTravail.filter(_isMomentDansIntervalleFn(m));
    if (inters.length === 1) {
        return inters[0];
    } else {
        return undefined;
    }
}

/**
 * Retourne pour un moment donné la durée avant le prochain intervalle,
 * ou `undefined` s'il n'y a pas d'intervalle après le moment
 */
function _getDureeAvantReprise(m: Moment, periodesDeTravail: ConfigIntervalle[]): Duration {
    const debutIntervalle = periodesDeTravail
        .map(i => getMomentPourHeureMinute(i.debut, m))
        .find(debut => m.isBefore(debut));
    return debutIntervalle && moment.duration(debutIntervalle.diff(m));
}

/**
 * Retourne pour un moment donné la durée avant le premier intervalle le jour suivant
 */
function _getDureeAvantRepriseLeJourSuivant(m: Moment, periodesDeTravail: ConfigIntervalle[]): Duration {
    const jourSuivant = m.clone().add(1, 'd');
    const debut = getMomentPourHeureMinute(periodesDeTravail[0].debut, jourSuivant);
    return moment.duration(debut.diff(m));
}

/**
 * Retourne la durée avant la prochaine reprise
 */
export function getDureeAvantReprise(m: Moment, periodesDeTravail: ConfigIntervalle[]): Duration {
    return _getDureeAvantReprise(m, periodesDeTravail)
        || _getDureeAvantRepriseLeJourSuivant(m, periodesDeTravail);
}

/**
 * Retourne `true` si on est dans une période de travail :
 * - Entre le début et la fin d'une période de travail
 * - Un jour ouvré
 */
export function isMomentValide(aMoment: Moment, journee: ConfigIntervalle[]): boolean {
    return isHeureDeTravail(aMoment, journee) && aMoment.isWorkingDay();
}

/**
 * Retourne `true` si le moment donné se trouve dans un intervalle de travail
 */
export function isHeureDeTravail(aMoment: Moment, journee: ConfigIntervalle[]): boolean {
    return journee.some(periode => {
        const debut = getMomentPourHeureMinute(periode.debut, aMoment);
        const fin = getMomentPourHeureMinute(periode.fin, aMoment);
        return aMoment.isSameOrAfter(debut) && aMoment.isSameOrBefore(fin);
    });
}

/**
 * Calcule la date du prochain mouvement en fonction du moment et de la durée restante
 */
export function calculerDateMouvement(aMoment: Moment, duree: number, journee: ConfigIntervalle[]): Moment {
    if (!journee || !journee.length) {
        throw new Error('Erreur de configuration de "journee" : non défini ou vide');
    }

    const m = aMoment.clone();

    // Si on n'est pas sur un jour de travail, on se positionne sur le jour suivant
    if (!m.isWorkingDay()) {
        m.add(1, 'd').startOf('day');
        return calculerDateMouvement(m, duree, journee);
    }

    const periodesDeTravail = getPeriodesTriees(journee);
    const intervalle = findPeriodeDeTravail(m, periodesDeTravail);

    if (intervalle) {
        const dureeAvantPause = moment.duration(getMomentPourHeureMinute(intervalle.fin, m).diff(m));
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
        return calculerDateMouvement(m, duree, journee);
    }
}

/**
 * Calcule le temps restant entre un moment donné et un moment cible
 */
export function calculerTempsRestantAvantDateDonnee(nowMoment: Moment, cibleMoment: Moment, journee: ConfigIntervalle[]): number {
    if (!journee || !journee.length) {
        throw new Error('Erreur de configuration de "journee" : non défini ou vide');
    }

    const m = nowMoment.clone();

    // Si on n'est pas sur un jour de travail, on se positionne sur le jour suivant
    if (!m.isWorkingDay()) {
        m.add(1, 'd').startOf('day');
        return calculerTempsRestantAvantDateDonnee(m, cibleMoment, journee);
    }

    const periodesDeTravail = getPeriodesTriees(journee);
    const intervalle = findPeriodeDeTravail(m, periodesDeTravail);

    if (intervalle) {
        const dureeTotale = cibleMoment.diff(m, 'seconds');
        const dureeAvantPause = moment.duration(getMomentPourHeureMinute(intervalle.fin, m).diff(m));
        if (dureeAvantPause.asSeconds() > dureeTotale) {
            return dureeTotale;
        } else {
            m.add(dureeAvantPause);
            // appLog('dureeAvantPause.asSeconds()', dureeAvantPause.asSeconds());
            return dureeAvantPause.asSeconds() + calculerTempsRestantAvantDateDonnee(m, cibleMoment, journee);
        }
    } else {
        // On calcule la durée restante de la pause
        const dureeAvantReprise = getDureeAvantReprise(m, periodesDeTravail);
        // Et on se positionne à la fin de la pause
        m.add(dureeAvantReprise);
        return calculerTempsRestantAvantDateDonnee(m, cibleMoment, journee);
    }
}

