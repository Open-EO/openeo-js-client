// import the JS client main part (Client) for the actual functionality
// and some classes (Connection, Capabilities) and types (Collections, Processes) for TypeScript stuff
import { Client, Connection, Capabilities, Collections, Processes } from '@openeo/js-client';

let url: string = "https://earthengine.openeo.org";   // Insert the openEO server URL here
let connection: Connection = null;   // Reserve a variable for the connection and specify its type

console.log('URL: ' + url);
console.log('Client Version: ' + Client.clientVersion());

Client.connect(url)
.then((c: Connection): Capabilities => {   // specify parameter type and return type
	connection = c;
	return connection.capabilities();
})
.then((capabilities: Capabilities): Promise<Collections> => {   // as before, note the `Promise<>` generic
	console.log('Server Version: ' + capabilities.apiVersion());
	return connection.listCollections();
})
.then((collections: Collections): Promise<Processes> => {   // note that `Promise<Collections>` has become `Collections`
	console.log('Number of supported collections: ' + collections.collections.length);
	return connection.listProcesses();
})
.then((processes: Processes): void => {   // final callback in chain doesn't return anything
	console.log('Number of supported processes: ' + processes.processes.length);
	return;
})
.catch((err: Error) => console.error(err.message));
