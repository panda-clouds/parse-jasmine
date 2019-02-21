
const PCParseJasmine = require('../src/PCParseJasmine.js');
const Parse = require('parse/node');

describe('check beforesave in v2.8.4', () => {
	// const failClass = 'FailClass';
	// const failClassError = 'Saves to this class always fail';
	// const passClass = 'PassClass';
	// const passClassMessage = 'Saves to this class always pass';

	// function cloudPage(){
	// }
	const cloud =
`
Parse.Cloud.define('challenge', function(request, response) {
  response.success('everest');
});
Parse.Cloud.define('useDynamicClass', function(request, response) {
	
	const MyClass = require(__dirname + '/PCTestClass.js');
	response.success(MyClass.challenge());
});
Parse.Cloud.beforeSave('FailClass',(request,response)=>{
	response.error('Saves to this class always fail');
})
Parse.Cloud.beforeSave('PassClass',(request,response)=>{
	response.success('Saves to this class always fail');
})`;
	const parseRunner = new PCParseJasmine();

	parseRunner.parseVersion('2.8.4');
	parseRunner.cloud(cloud);
	parseRunner.loadFile('./src/PCTestClass.js', 'PCTestClass.js');

	beforeAll(done => {
		parseRunner.startParseServer()
			.then(done).catch(done.fail);
	}, 1000 * 60 * 2);

	afterAll(done => {
		parseRunner.cleanUp()
			.then(done).catch(done.fail);
	});

	it('should return everest', done => {
		expect.assertions(1);
		Parse.Cloud.run('challenge')
			.then(result => {
				expect(result).toBe('everest');
				done();
			}, done.fail)
			.catch(done.fail);
	});

	it('should read from dynamic class', done => {
		expect.assertions(1);
		Parse.Cloud.run('useDynamicClass')
			.then(result => {
				expect(result).toBe('everest');
				done();
			}, done.fail)
			.catch(done.fail);
	});

	it('passes when allowed by beforeSave', done => {
		expect.assertions(2);
		const obj = new Parse.Object('PassClass');

		obj.set('mykey', 'value');
		obj.save()
			.then(result => {
				expect(result).toBeDefined();
				expect(result.className).toBe('PassClass');
				done();
			}, done.fail)
			.catch(done.fail);
	});

	it('fails when blocked by beforeSave', done => {
		expect.assertions(2);
		const obj = new Parse.Object('FailClass');

		obj.set('mykey', 'value');
		obj.save()
			.then(done.fail, result => {
				expect(result).toBeDefined();
				expect(result.message).toBe('Saves to this class always fail');
				done();
			})
			.catch(done.fail);
	});
});

describe('check beforesave in v3.1.3', () => {
	// const failClass = 'FailClass';
	// const failClassError = 'Saves to this class always fail';
	// const passClass = 'PassClass';
	// const passClassMessage = 'Saves to this class always pass';

	// function cloudPage(){
	// }
	const cloud =
`
Parse.Cloud.define('challenge', function(request, response) {
	return 'everest';
});
Parse.Cloud.define('useDynamicClass', async request => {
	
	const MyClass = require(__dirname + '/PCTestClass.js');
	return await MyClass.challenge()
});
Parse.Cloud.beforeSave('FailClass', request => {
	throw new Error('Saves to this class always fail');
})
Parse.Cloud.beforeSave('PassClass', request => {
	// passes by default
})`;
	const parseRunner = new PCParseJasmine();

	parseRunner.parseVersion('3.1.3');
	parseRunner.cloud(cloud);
	parseRunner.loadFile('./src/PCTestClass.js', 'PCTestClass.js');

	beforeAll(done => {
		parseRunner.startParseServer()
			.then(done).catch(done.fail);
	}, 1000 * 60 * 2);

	afterAll(done => {
		parseRunner.cleanUp()
			.then(done).catch(done.fail);
	});

	it('should return everest', done => {
		expect.assertions(1);
		Parse.Cloud.run('challenge')
			.then(result => {
				expect(result).toBe('everest');
				done();
			}, done.fail)
			.catch(done.fail);
	});

	it('should read from dynamic class', done => {
		expect.assertions(1);
		Parse.Cloud.run('useDynamicClass')
			.then(result => {
				expect(result).toBe('everest');
				done();
			}, done.fail)
			.catch(done.fail);
	});

	it('passes when allowed by beforeSave', done => {
		expect.assertions(2);
		const obj = new Parse.Object('PassClass');

		obj.set('mykey', 'value');
		obj.save()
			.then(result => {
				expect(result).toBeDefined();
				expect(result.className).toBe('PassClass');
				done();
			}, done.fail)
			.catch(done.fail);
	});

	it('fails when blocked by beforeSave', done => {
		expect.assertions(2);
		const obj = new Parse.Object('FailClass');

		obj.set('mykey', 'value');
		obj.save()
			.then(done.fail, result => {
				expect(result).toBeDefined();
				expect(result.message).toBe('Saves to this class always fail');
				done();
			})
			.catch(done.fail);
	});
});
