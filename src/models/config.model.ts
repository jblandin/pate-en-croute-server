export interface Config {
    'app': { 'port': number };
    'cycle': ConfigHeureMinute;
    'journee': ConfigIntervalle[];
}

export interface ConfigIntervalle {
    'debut': ConfigHeureMinute;
    'fin': ConfigHeureMinute;
}

export interface ConfigHeureMinute {
    'heure': number;
    'minute': number;
}
