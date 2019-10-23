import { expect } from 'chai';
import 'mocha';
import moment = require('moment-ferie-fr');
import { calculerDateMouvement } from './index';

describe('calculerDateMouvement', () => {
    it('Ajoute une durée', () => {
        const m = moment();
        const result = calculerDateMouvement(m, 3600);
        expect(result.hour()).equal(m.hour() + 1);
    });

  });
