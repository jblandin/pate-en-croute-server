# pate-en-croute-server
Projet de timer pour F-P

## Contexte

Au sein d'une ligne de production, on cadence l'avancée de la ligne (mouvement) suivant un rythme défini (ex. toutes les 15h15).

Ce cadencement ne prend en compte que les heures travaillées, c'est à dire que la nuit, les weekend et pendant les jours de fermeture de l'usine, le temps restant avant le prochain mouvement est mis en pause.

Il arrive aussi que l'on ai besoin de mettre en pause la production (opération de maintenance, ...), le temps restant avant le prochain mouvement est alors mis en pause.

## Expression du besoin

*(1ère phase)*

Le besoin est d'avoir un affichage commun sur plusieurs écrans, répartis dans plusieurs batiments, du temps restant avant le prochain mouvement et celui d'après.

Les horaires de début et fin de journée doivent pouvoir être configurables, ainsi que la durée d'un cycle (durée entre deux mouvements).

Le temps restant doit se mettre en pause automatiquement en fin de journée, durant les weekends, et reprendre en début de journée ouvrée. Pour les jours de fermeture de l'usine, le temps restant sera mis en pause manuellement.

Le temps restant doit pouvoir être mis en pause à tout moment, et être sorti de pause. Il doit également pouvoir être réinitialisé, et être fixé à une valeur arbitraire.

La marge d'erreur acceptable du temps restant est de l'ordre de la minute.

L'affichage devra présenter le logo de la société, les deux compteurs de temps restant avant le prochain mouvement et celui d'après, et en bonus la date correspondante aux mouvements, qui prendra en compte les pauses.

## Environnement

L'affichage se fera sur des smartTV, pouvant être reliées au réseau (WiFi ou filaire) et pouvant afficher une page web.

Pas de disposition de sécurité particulière, réseau de l'entreprise utilisable sans contrainte.

## Contraintes

Le serveur devra être fourni.

Maintenance de 6 mois.

## Délais

Phase de tests la semaine du 28/10/2019.

Mise en production le 04/11/2019.

