/* tslint:disable:no-unused-expression */
import { expect } from 'chai';
import 'mocha';
import moment = require('moment-ferie-fr');
import * as calculDateService from './calcul-date.service';

const journeeComplete = [{
    debut: {
        heure: 0,
        minute: 0
    },
    fin: {
        heure: 23,
        minute: 59
    }
}];

const journeeAvecPauseUneHeure = [{
    debut: {
        heure: 5,
        minute: 0
    },
    fin: {
        heure: 16,
        minute: 0
    }
},
{
    debut: {
        heure: 17,
        minute: 0
    },
    fin: {
        heure: 21,
        minute: 0
    }
}];


const journeeAvecDeuxPauseUneHeure = [{
    debut: {
        heure: 5,
        minute: 0
    },
    fin: {
        heure: 10,
        minute: 0
    }
},
{
    debut: {
        heure: 11,
        minute: 0
    },
    fin: {
        heure: 16,
        minute: 0
    }
},
{
    debut: {
        heure: 17,
        minute: 0
    },
    fin: {
        heure: 21,
        minute: 0
    }
}];

const journeeFP = [
    {
        debut: {
            heure: 5,
            minute: 0
        },
        fin: {
            heure: 9,
            minute: 45
        }
    },
    {
        debut: {
            heure: 10,
            minute: 15
        },
        fin: {
            heure: 21,
            minute: 0
        }
    }
];

describe('findPeriodeDeTravail', () => {
    it('doit retourner la période trouvée sur journée simple', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.findPeriodeDeTravail(m, journeeComplete);
        expect(result).to.equal(journeeComplete[0]);
    });

    it('doit retourner la période 1 sur journée avec pause', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.findPeriodeDeTravail(m, journeeAvecPauseUneHeure);
        expect(result).to.equal(journeeAvecPauseUneHeure[0]);
    });

    it('doit retourner la période 2 sur journée avec pause', () => {
        const m = moment('24/10/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.findPeriodeDeTravail(m, journeeAvecPauseUneHeure);
        expect(result).to.equal(journeeAvecPauseUneHeure[1]);
    });

    it('ne doit pas retourner de période si pas dans une période de travail', () => {
        const m = moment('24/10/2019 16:30:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.findPeriodeDeTravail(m, journeeAvecPauseUneHeure);
        expect(result).to.be.undefined;
    });
});

describe('getDureeAvantReprise', () => {
    it('doit trouver la durée avant la période 1', () => {
        const m = moment('24/10/2019 4:30:12', 'DD/MM/YYYY HH:mm:ss');
        const duree = calculDateService.getDureeAvantReprise(m, journeeAvecPauseUneHeure);
        expect(duree.asSeconds()).to.be.equal(48 + 29 * 60);
    });

    it('doit trouver la durée avant la période 2', () => {
        const m = moment('24/10/2019 16:30:12', 'DD/MM/YYYY HH:mm:ss');
        const duree = calculDateService.getDureeAvantReprise(m, journeeAvecPauseUneHeure);
        expect(duree.asSeconds()).to.be.equal(48 + 29 * 60);
    });

    it('doit trouver la durée avant la période 1 du jour suivant', () => {
        const m = moment('24/10/2019 21:30:12', 'DD/MM/YYYY HH:mm:ss');
        const duree = calculDateService.getDureeAvantReprise(m, journeeAvecPauseUneHeure);
        expect(duree.asSeconds()).to.be.equal(48 + 29 * 60 + 7 * 3600);
    });

});

describe('calculerDateMouvement', () => {
    it('Journée non renseignée', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        expect(() => calculDateService.calculerDateMouvement(m, 3600, undefined)).to.throw();
    });

    it('Journée vide', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        expect(() => calculDateService.calculerDateMouvement(m, 3600, undefined)).to.throw();
    });

    it('Ajout simple d\'une heure sur journée complète', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 3600;
        const result = calculDateService.calculerDateMouvement(m, s, journeeComplete);
        expect(result.hour()).equal(16);
    });

    it('Ajout de deux heures avec une pause d\'une heure au milieu', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 2 * 3600;
        const result = calculDateService.calculerDateMouvement(m, s, journeeAvecPauseUneHeure);
        expect(result.hour()).equal(18);
        expect(result.minute()).equal(30);
    });

    it('Ajout de six heures avec deux pauses', () => {
        const m = moment('24/10/2019 9:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const result = calculDateService.calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure);
        expect(result.format('DD/MM/YYYY HH:mm:ss')).to.equal('24/10/2019 17:30:12');
    });

    it('Ajout de six heures avec deux pauses et mouvement sur jour suivant', () => {
        const m = moment('24/10/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const result = calculDateService.calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure);
        expect(result.format('DD/MM/YYYY HH:mm:ss')).to.equal('25/10/2019 07:30:12');
    });

    it('Ajout de six heures avec deux pauses, changement de jour, et weekend', () => {
        const m = moment('25/10/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const result = calculDateService.calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure);
        expect(result.format('DD/MM/YYYY HH:mm:ss')).to.equal('28/10/2019 07:30:12');
    });

    it('Ajout de six heures avec deux pauses, changement de jour, et weekend, avec tous les jours valides', () => {
        const m = moment('25/10/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const result = calculDateService.calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure, true);
        expect(result.format('DD/MM/YYYY HH:mm:ss')).to.equal('26/10/2019 07:30:12');
    });

    it('Ajout de six heures avec deux pauses, changement de jour, weekend et jour férié', () => {
        const m = moment('08/11/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const result = calculDateService.calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure);
        expect(result.format('DD/MM/YYYY HH:mm:ss')).to.equal('12/11/2019 07:30:12');
    });

    it('Ajout de six heures avec deux pauses, changement de jour, weekend et jour férié, avec tous les jours valides', () => {
        const m = moment('08/11/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const result = calculDateService.calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure, true);
        expect(result.format('DD/MM/YYYY HH:mm:ss')).to.equal('09/11/2019 07:30:12');
    });

    it('Conditions réelles', () => {
        const m = moment('26/10/2019 18:11:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 19.375 * 3600;
        const result = calculDateService.calculerDateMouvement(m, s, journeeFP);
        expect(result.format('DD/MM/YYYY HH:mm:ss')).to.equal('29/10/2019 08:52:30');
    });

});

describe('calculerTempsRestantAvantDateDonnee', () => {
    it('Journée non renseignée', () => {
        const now = moment('24/10/2019 18:11:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('24/10/2019 18:21:12', 'DD/MM/YYYY HH:mm:ss');
        expect(() => calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, undefined)).to.throw();
    });

    it('Journée vide', () => {
        const now = moment('24/10/2019 18:11:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('24/10/2019 18:21:12', 'DD/MM/YYYY HH:mm:ss');
        expect(() => calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, undefined)).to.throw();
    });

    it('Durée sans pause', () => {
        const now = moment('24/10/2019 18:11:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('24/10/2019 18:21:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, journeeComplete);
        expect(result).to.equal(10 * 60);
    });

    it(`Durée avec une pause (de 16h à 17h)`, () => {
        const now = moment('24/10/2019 15:11:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('24/10/2019 18:11:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, journeeAvecPauseUneHeure);
        expect(result).to.equal(2 * 3600);
    });

    it(`Durée de 6h avec deux pauses (de 10h à 11h et de 16h à 17h) et mouvement sur jour suivant`, () => {
        const now = moment('24/10/2019 17:31:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('25/10/2019 07:31:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, journeeAvecDeuxPauseUneHeure);
        expect(result).to.equal(6 * 3600);
    });

    it(`Durée de 6h avec deux pauses (de 10h à 11h et de 16h à 17h), changement de jour, et week-end`, () => {
        const now = moment('25/10/2019 17:31:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('28/10/2019 07:31:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, journeeAvecDeuxPauseUneHeure);
        expect(result).to.equal(6 * 3600);
    });

    it(`Durée de 6h avec deux pauses (de 10h à 11h et de 16h à 17h), changement de jour, et week-end, avec tous les jours valides`, () => {
        const now = moment('25/10/2019 17:31:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('26/10/2019 07:31:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, journeeAvecDeuxPauseUneHeure, true);
        expect(result).to.equal(6 * 3600);
    });

    it(`Durée de 6h avec deux pauses (de 10h à 11h et de 16h à 17h), changement de jour, week-end et jour férié`, () => {
        const now = moment('08/11/2019 17:31:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('12/11/2019 07:31:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, journeeAvecDeuxPauseUneHeure);
        expect(result).to.equal(6 * 3600);
    });

    it(`Durée de 6h avec deux pauses (de 10h à 11h et de 16h à 17h), changement de jour, week-end et jour férié, avec tous les jours valides`, () => {
        const now = moment('08/11/2019 17:31:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('09/11/2019 07:31:12', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, journeeAvecDeuxPauseUneHeure, true);
        expect(result).to.equal(6 * 3600);
    });

    it('Conditions réelles', () => {
        const now = moment('26/10/2019 18:11:12', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('29/10/2019 08:52:30', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, journeeFP);
        expect(result).to.equal(19.375 * 3600);
    });

    it('Conditions réelles 2', () => {
        const now = moment('13/12/2019 12:06:55', 'DD/MM/YYYY HH:mm:ss');
        const cible = moment('16/12/2019 15:59:25', 'DD/MM/YYYY HH:mm:ss');
        const result = calculDateService.calculerTempsRestantAvantDateDonnee(now, cible, journeeFP);
        expect(result).to.equal(19.375 * 3600);
    });
});
