import { io } from 'socket.io-client';

// Connect to the Socket.IO server
const socket = io('https://worker.api.sui-staging.int.bluefin.io'); // Replace with your server URL

// Event handler for when the client is connected
socket.on('connect', () => {
  console.log('Connected to the server');
});

// Event handler for custom events from the server
socket.on('RpcUrlResolved', (message: string) => {
  console.log(`Server says: ${message}`);
});

// Emit a custom event to the server
socket.emit('messageToServer', 'Hello from the client');

// Disconnect from the server when done
socket.on('disconnect', () => {
  console.log('Disconnected from the server');
});