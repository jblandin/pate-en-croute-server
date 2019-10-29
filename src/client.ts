import express from 'express';
import config from '../config/config-client.json';

function startServer() {
    const app = express();

    // ---- SERVE STATIC FILES ---- //
    app.get('*.*', express.static(config.app_folder, {maxAge: '1d'}));

    // ---- SERVE APLICATION PATHS ---- //
    app.all('*', (req, res) => {
        res.status(200).sendFile(`/`, {root: config.app_folder});
    });

    // ---- ENABLE CORS FOR ALL ORIGINS ---- //
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    // ---- START UP THE NODE SERVER  ----
    app.listen(config.port, () => {
        console.log('Node Express server for ' + app.name + ' listening on port: ' + config.port);
    });
}

module.exports = {
    start: startServer
};


