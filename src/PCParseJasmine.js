var PCBash = require('@panda-clouds/parse-bash');
var Parse = require('parse/node');
const exampleAppId = "example-app-id";
const exampleJavascriptKey = "example-javascript-key";
const exampleMasterKey = "example-master-key";
class PCParseJasmine  {

	constructor() {
		//Empty Constructor
		const now = new Date()
		this.seed = now.getTime();
	}

	cloud(cloudPage){
		this.cloudPage = cloudPage;
	}
	static defaultMongoURL(){
		return "mongodb://host.docker.internal:27017";
	}
	static defaultDBName(){
		return "parse-test";
	}
	static tempDir(){

		// we have a "temp" directory in the root of this projects
		var path = __dirname + '/../temp';

		// Notice the double-backslashes on this following line
		path = path.replace(/ /g, '\\ ');
		return path;
	}

	startParseServer(){
		process.env.TESTING = true;
		if(process.env.SPEC_USE_EXTERNAL_SERVER){
			Parse.initialize(exampleAppId,exampleJavascriptKey,exampleMasterKey);
			Parse.serverURL = 'http://localhost:1337/1';
			return new Promise.resolve();
		}else{

			return PCBash.runCommandPromise('docker ps')
				.then(()=>{
					const command = 'docker run --rm -d ' +
					'--name mongo-' + this.seed + ' ' +
					'-p 27017:27017 ' +
					'mongo ' +
					''
					return PCBash.runCommandPromise(command)
				})
				.then(()=>{
					const config = {};
					config.allowInsecureHTTP = true;
					const app = {};
					app.appId = exampleAppId
					app.masterKey = exampleMasterKey;
					app.javascriptKey = exampleJavascriptKey;
					app.port = 1337;
					app.mountPath = '/1';
					// app.databaseName = PCParseJasmine.defaultDBName();
					// derived data
					// mac hack
					app.databaseURI = "mongodb://host.docker.internal:27017/" + PCParseJasmine.defaultDBName();
					app.publicServerURL = "http://localhost:" + app.port + app.mountPath;
					app.serverURL = app.publicServerURL;
					app.cloud = '/parse-server/cloud/main.js';
					config.apps = [app];
					return PCBash.putStringInFile(config, PCParseJasmine.tempDir() + "/config-" + this.seed)
				})
				.then(()=>{
					return PCBash.putStringInFile(this.cloudPage, PCParseJasmine.tempDir() + "/cloud-" + this.seed)
				})
				.then(()=>{
					const command = 'docker run --rm -d ' +
					'--name parse-' + this.seed + ' ' +
					'-v ' + PCParseJasmine.tempDir() + '/config-' + this.seed + ':/parse-server/configuration.json ' +
					'-v ' + PCParseJasmine.tempDir() + '/cloud-' + this.seed + ':/parse-server/cloud/main.js ' +
					'-p 1337:1337 ' +
					'parseplatform/parse-server:2.8.4 ' +
					'/parse-server/configuration.json';
					return PCBash.runCommandPromise(command)
				})
				.then(()=>{
					return PCBash.runCommandPromise(
						'until $(curl --output /dev/null --silent --head --fail http://localhost:1337/1/health); do\n' +
					"    printf 'Waiting for Parse Server to come up...\n'\n" +
					'    sleep 1\n' +
					'done'
					)
				})
				.then(()=>{
					Parse.initialize(exampleAppId,exampleJavascriptKey,exampleMasterKey);
					Parse.serverURL = 'http://localhost:1337/1';
					// eslint-disable-next-line no-console
					console.log("Parse Server up and running")
				})
		}
	}

	cleanUp(){
		process.env.TESTING = true;
		if(process.env.SPEC_USE_EXTERNAL_SERVER){
			// no clean up
			return new Promise.resolve();
		}else{

			return PCBash.runCommandPromise('docker ps')
				.then(()=>{
					const command = 'docker logs parse-' + this.seed;
					return PCBash.runCommandPromise(command)
						.catch(()=>{
						});
				})
				.then(()=>{
					const command = 'rm ' + PCParseJasmine.tempDir() + '/cloud-' + this.seed;
					return PCBash.runCommandPromise(command)
						.catch(()=>{
						});
				})
				.then(()=>{
					const command = 'rm ' + PCParseJasmine.tempDir() + '/config-' + this.seed;
					return PCBash.runCommandPromise(command)
						.catch(()=>{
						});
				})
				.then(()=>{
					const command = 'docker stop parse-' + this.seed;
					return PCBash.runCommandPromise(command)
						.catch(()=>{

						});
				})
				.then(()=>{
					const command = 'docker stop mongo-' + this.seed;
					return PCBash.runCommandPromise(command)
						.catch(()=>{

						});
				})
		}
	}
}

module.exports = PCParseJasmine;