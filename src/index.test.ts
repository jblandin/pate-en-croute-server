/* tslint:disable:no-unused-expression */
import { expect } from 'chai';
import 'mocha';
import moment = require('moment-ferie-fr');
import { calculerDateMouvement, getPeriodeDeTravail, getDureeAvantReprise } from './index';

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

describe('getPeriodeDeTravail', () => {
    it('doit retourner la période trouvée sur journée simple', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        const res = getPeriodeDeTravail(m, journeeComplete);
        expect(res).to.equal(journeeComplete[0]);
    });

    it('doit retourner la période 1 sur journée avec pause', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        const res = getPeriodeDeTravail(m, journeeAvecPauseUneHeure);
        expect(res).to.equal(journeeAvecPauseUneHeure[0]);
    });

    it('doit retourner la période 2 sur journée avec pause', () => {
        const m = moment('24/10/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const res = getPeriodeDeTravail(m, journeeAvecPauseUneHeure);
        expect(res).to.equal(journeeAvecPauseUneHeure[1]);
    });

    it('ne doit pas retourner de période si pas dans une période de travail', () => {
        const m = moment('24/10/2019 16:30:12', 'DD/MM/YYYY HH:mm:ss');
        const res = getPeriodeDeTravail(m, journeeAvecPauseUneHeure);
        expect(res).to.be.undefined;
    });
});

describe('getDureeAvantReprise', () => {
    it('doit trouver la durée avant la période 1', () => {
        const m = moment('24/10/2019 4:30:12', 'DD/MM/YYYY HH:mm:ss');
        const duree = getDureeAvantReprise(m, journeeAvecPauseUneHeure);
        expect(duree.asSeconds()).to.be.equal(48 + 29 * 60);
    });

    it('doit trouver la durée avant la période 2', () => {
        const m = moment('24/10/2019 16:30:12', 'DD/MM/YYYY HH:mm:ss');
        const duree = getDureeAvantReprise(m, journeeAvecPauseUneHeure);
        expect(duree.asSeconds()).to.be.equal(48 + 29 * 60);
    });

    it('doit trouver la durée avant la période 1 du jour suivant', () => {
        const m = moment('24/10/2019 21:30:12', 'DD/MM/YYYY HH:mm:ss');
        const duree = getDureeAvantReprise(m, journeeAvecPauseUneHeure);
        expect(duree.asSeconds()).to.be.equal(48 + 29 * 60 + 7 * 3600);
    });

});

describe('calculerDateMouvement', () => {
    it('Journée non renseignée', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        expect(() => calculerDateMouvement(m, 3600, undefined)).to.throw();

    });

    it('Journée vide', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        expect(() => calculerDateMouvement(m, 3600, undefined)).to.throw();
    });

    it('Ajout simple d\'une heure sur journée complète', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 3600;
        const rest = calculerDateMouvement(m, s, journeeComplete);
        expect(rest.hour()).equal(16);
    });

    it('Ajout de deux heures avec une pause d\'une heure au milieu', () => {
        const m = moment('24/10/2019 15:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 2 * 3600;
        const rest = calculerDateMouvement(m, s, journeeAvecPauseUneHeure);
        expect(rest.hour()).equal(18);
        expect(rest.minute()).equal(30);
    });

    it('Ajout de six heures avec deux pauses', () => {
        const m = moment('24/10/2019 9:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const rest = calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure);
        expect(rest.format('DD/MM/YYYY HH:mm:ss')).to.equal('24/10/2019 17:30:12');
    });

    it('Ajout de six heures avec deux pauses et mouvement sur jour suivant', () => {
        const m = moment('24/10/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const rest = calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure);
        expect(rest.format('DD/MM/YYYY HH:mm:ss')).to.equal('25/10/2019 07:30:12');
    });

    it('Ajout de six heures avec deux pauses, changement de jour, et weekend', () => {
        const m = moment('25/10/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const rest = calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure);
        expect(rest.format('DD/MM/YYYY HH:mm:ss')).to.equal('28/10/2019 07:30:12');
    });

    it('Ajout de six heures avec deux pauses, changement de jour, weekend et jour férié', () => {
        const m = moment('08/11/2019 17:30:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 6 * 3600;
        const rest = calculerDateMouvement(m, s, journeeAvecDeuxPauseUneHeure);
        expect(rest.format('DD/MM/YYYY HH:mm:ss')).to.equal('12/11/2019 07:30:12');
    });

    it('Conditions réelles', () => {
        const m = moment('26/10/2019 18:11:12', 'DD/MM/YYYY HH:mm:ss');
        const s = 19.375 * 3600;
        const rest = calculerDateMouvement(m, s, journeeFP);
        expect(rest.format('DD/MM/YYYY HH:mm:ss')).to.equal('29/10/2019 08:52:30');
    });

  });
