/* global Promise */
const fs = require('fs');

fs.readFileAsync = filename => {
	return new Promise((resolve, reject) => {
		fs.readFile(filename, (err, buffer) => {
			if (err) {
				reject(err);
			} else {
				resolve(buffer.toString());
			}
		});
	});
};

const PCBash = require('@panda-clouds/parse-bash');
const Parse = require('parse/node');
const exampleAppId = 'example-app-id';
const exampleJavascriptKey = 'example-javascript-key';
const exampleMasterKey = 'example-master-key';

class PCParseJasmine {
	constructor() {
		const now = new Date();

		this.seed = now.getTime();
		this.parseVersionValue = '3.1.3';
	}

	parseVersion(version) {
		this.parseVersionValue = version;
	}
	loadFile(path, name) {
		this.requireFilePath = path;
		this.requireFileName = name;
	}

	cloud(cloudPage) {
		this.cloudPage = cloudPage;
	}

	static defaultMongoURL() {
		return 'mongodb://host.docker.internal:27017';
	}
	static defaultDBName() {
		return 'parse-test';
	}
	static tempDir() {
		// This failed because we use Jenkins in docker.
		// the 'write' would go into the jenkins container
		// and the 'read' would go to the host through the docker.sock
		// also we couldn't match the jenkins volume (which would work)
		// because the new one kept saying 'invalid username/password'

		// A: https://github.com/jenkinsci/docker/issues/174
		// basically, you can't just move the dir
		// // we have a 'temp' directory in the root of this projects
		// var path = __dirname;

		// // Notice the double-backslashes on this following line
		// path = path.replace(/ /g, '\\ ');

		// // eslint-disable-next-line no-console
		// console.log('tempDir: ' + path)
		// return path;
		return '/tmp/testing';
	}

	startParseServer() {
		process.env.TESTING = true;

		if (process.env.SPEC_USE_EXTERNAL_SERVER) {
			Parse.initialize(exampleAppId, exampleJavascriptKey, exampleMasterKey);
			Parse.serverURL = 'http://localhost:1337/1';

			return new Promise.resolve();
		}

		return PCBash.runCommandPromise('docker ps')
			.then(() => {
				return PCBash.runCommandPromise('uname -s')
					.then(result => {
						if (result === 'Darwin') {
							// this hack is requried when using Docker for mac
							this.hostURL = 'host.docker.internal';
							this.net = '';
						} else if (result === 'Linux') {
							this.hostURL = 'localhost';
							this.net = '--net host';
						}
					});
			})
			.then(() => {
				return PCBash.runCommandPromise('mkdir -p ' + PCParseJasmine.tempDir());
			})
			.then(() => {
				const command = 'docker run --rm -d ' + this.net + ' ' +
				'--name mongo-' + this.seed + ' ' +
				'-p 27017:27017 ' +
				'mongo ' +
				'';

				return PCBash.runCommandPromise(command);
			})
			.then(() => {
				const config = {};

				config.allowInsecureHTTP = true;
				const app = {};

				app.appId = exampleAppId;
				app.masterKey = exampleMasterKey;
				app.javascriptKey = exampleJavascriptKey;
				app.port = 1337;
				app.mountPath = '/1';
				// app.databaseName = PCParseJasmine.defaultDBName();
				// derived data
				// mac hack
				app.databaseURI = 'mongodb://' + this.hostURL + ':27017/' + PCParseJasmine.defaultDBName();
				app.publicServerURL = 'http://localhost:' + app.port + app.mountPath;
				app.serverURL = app.publicServerURL;
				app.cloud = '/parse-server/cloud/main-' + this.seed + '.js';
				config.apps = [app];

				return PCBash.putStringInFile(config, PCParseJasmine.tempDir() + '/config-' + this.seed);
			})
			.then(() => {
				return PCBash.runCommandPromise('pwd');
			})
			.then(() => {
				if (this.requireFilePath) {
					return fs.readFileAsync(this.requireFilePath)
						.then(result => {
							return PCBash.putStringInFile(result, PCParseJasmine.tempDir() + '/' + this.requireFileName);
						});
				}
			})
			.then(() => {
				return PCBash.putStringInFile(this.cloudPage, PCParseJasmine.tempDir() + '/main-' + this.seed + '.js');
			})
			.then(() => {
				const command = 'docker run --rm -d ' + this.net + ' ' +
				'--name parse-' + this.seed + ' ' +
				'-v ' + PCParseJasmine.tempDir() + '/config-' + this.seed + ':/parse-server/configuration.json ' +
				'-v ' + PCParseJasmine.tempDir() + ':/parse-server/cloud/ ' +
				'-p 1337:1337 ' +
				'parseplatform/parse-server:' + this.parseVersionValue + ' ' +
				'/parse-server/configuration.json';

				return PCBash.runCommandPromise(command);
			})
			.then(() => {
				return PCBash.runCommandPromise(
					'until $(curl --output /dev/null --silent --head --fail http://localhost:1337/1/health); do\n' +
				'    printf \'Waiting for Parse Server to come up...\n\'\n' +
				'    sleep 1\n' +
				'done'
				);
			})
			.then(() => {
				Parse.initialize(exampleAppId, exampleJavascriptKey, exampleMasterKey);
				Parse.serverURL = 'http://localhost:1337/1';
				// eslint-disable-next-line no-console
				console.log('Parse Server up and running');
			});
	}

	cleanUp() {
		process.env.TESTING = true;

		if (process.env.SPEC_USE_EXTERNAL_SERVER) {
			// no clean up
			return new Promise.resolve();
		}

		return PCBash.runCommandPromise('docker ps')
			.then(() => {
				const command = 'docker logs parse-' + this.seed;

				return PCBash.runCommandPromise(command)
					.catch(() => {
					});
			})
			.then(() => {
				const command = 'rm ' + PCParseJasmine.tempDir() + '/main-' + this.seed + '.js';

				return PCBash.runCommandPromise(command)
					.catch(() => {
					});
			})
			.then(() => {
				const command = 'rm ' + PCParseJasmine.tempDir() + '/config-' + this.seed;

				return PCBash.runCommandPromise(command)
					.catch(() => {
					});
			})
			.then(() => {
				if (this.requireFileName) {
					const command = 'rm ' + PCParseJasmine.tempDir() + '/' + this.requireFileName;

					return PCBash.runCommandPromise(command)
						.catch(() => {
						});
				}
			})
			.then(() => {
				const command = 'docker stop parse-' + this.seed;

				return PCBash.runCommandPromise(command)
					.catch(() => {

					});
			})
			.then(() => {
				const command = 'docker stop mongo-' + this.seed;

				return PCBash.runCommandPromise(command)
					.catch(() => {

					});
			});
	}
}

module.exports = PCParseJasmine;
