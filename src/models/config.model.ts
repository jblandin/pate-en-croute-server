export interface Config {
    'app': { 'port': number };
    'cycle': ConfigCycle;
    'journee': ConfigIntervalle[];
    'allDaysValides'?: boolean;
}

export interface ConfigCycle {
    'heures': number;
    'minutes': number;
    'secondes': number;
}

export interface ConfigIntervalle {
    'debut': ConfigHeureMinute;
    'fin': ConfigHeureMinute;
}

export interface ConfigHeureMinute {
    'heure': number;
    'minute': number;
}
