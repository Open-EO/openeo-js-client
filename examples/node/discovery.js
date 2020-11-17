// Import the JS client
const { OpenEO } = require('@openeo/js-client');

const url = "https://earthengine.openeo.org"; // Insert the openEO server URL here
let connection = null;

console.log('URL: ' + url);
console.log('Client Version: ' + OpenEO.clientVersion());

OpenEO.connect(url)
	.then(c => {
		connection = c;
		return connection.capabilities();
	})
	.then(capabilities => {
		console.log('Server Version: ' + capabilities.apiVersion());
		return connection.listCollections();
	})
	.then(collections => {
		console.log('Number of supported collections: ' + collections.collections.length);
		return connection.listProcesses();
	})
	.then(processes => {
		console.log('Number of supported processes: ' + processes.processes.length);
	})
	.catch(err => console.error(err.message));
