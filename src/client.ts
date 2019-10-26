import express from 'express';

const app = express();

const port = 8080;
const appFolder = '../pate-en-croute-client/dist/fp-affichage';


function startServer() {
    // ---- SERVE STATIC FILES ---- //
    app.get('*.*', express.static(appFolder, {maxAge: '0'}));

    // ---- SERVE APLICATION PATHS ---- //
    app.all('*', (req, res) => {
        res.status(200).sendFile(`/`, {root: appFolder});
    });

    // ---- ENABLE CORS FOR ALL ORIGINS ---- //
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    // ---- START UP THE NODE SERVER  ----
    app.listen(port, () => {
        console.log('Node Express server for ' + app.name + ' listening on http://localhost:' + port);
    });
}

module.exports = {
    start: startServer
};


