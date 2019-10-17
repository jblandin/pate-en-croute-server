var socket = require('socket.io-client')('http://localhost:3000');
socket.on('connect', () => console.log('connexion'));
socket.emit('start', 'test 1');
socket.emit('start', 'test 2');
socket.emit('stop',  'test 3');
socket.emit('pause', 'test 4');
socket.emit('init',  'test 5');

socket.on('app-timer', data => console.log('app-timer', data));
socket.on('mouvement', data => console.log('mouvement ! ', data));

socket.on('disconnect', () => console.log('disconnect'));