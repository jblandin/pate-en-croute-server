module.exports = {
  apps : [{
    name   : "fp-affichage-serveur",
    script : "./bin/start",
    error_file : "./log/fp-affichage-serveur.err.log",
    out_file : "./log/fp-affichage-serveur.out.log",
    env: {
      NODE_ENV: "production"
    },
  },
  {
    name   : "fp-affichage-client",
    script : "./bin/start-client",
    error_file : "./log/fp-affichage-client.err.log",
    out_file : "./log/fp-affichage-client.out.log"
  }]
}
