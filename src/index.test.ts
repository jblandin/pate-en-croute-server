import { expect } from 'chai';
import 'mocha';
import moment = require('moment-ferie-fr');
import { calculerDateMouvement } from './index';

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
        const rest = calculerDateMouvement(m, 3600, journeeComplete);
        expect(rest.hour()).equal(16);
    });

  });
