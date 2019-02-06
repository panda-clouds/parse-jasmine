
const PCParseJasmine = require("../src/PCParseJasmine.js");
var Parse = require('parse/node');
describe('check beforesave', () => {

	// const failClass = "FailClass";
	// const failClassError = "Saves to this class always fail";
	// const passClass = "PassClass";
	// const passClassMessage = "Saves to this class always pass";

	// function cloudPage(){
	// }
	const cloud =
`
Parse.Cloud.define("challenge", function(request, response) {
  response.success("everest");
});
Parse.Cloud.beforeSave("FailClass",(request,response)=>{
	if(response && response.error){
		// Parse Sever V2.x and lower
		response.error("Saves to this class always fail");
	}else{
		// Parse Sever V3.x and up
		throw new Error("Saves to this class always fail");
	}
})
Parse.Cloud.beforeSave("PassClass",(request,response)=>{
	if(response && response.success){
		// Parse Sever V2.x and lower
		response.success("Saves to this class always fail");
	}else{
		// Parse Sever V3.x and up
		return "Saves to this class always fail";
	}
})`
	// eslint-disable-next-line no-console
	console.log(cloud);
	const parseRunner = new PCParseJasmine();
	parseRunner.cloud(cloud);

	beforeAll((done) => {
		parseRunner.startParseServer()
			.then(done).catch(done.fail);
	}, 1000 * 60 * 2);

	afterAll((done) => {
		parseRunner.cleanUp()
			.then(done).catch(done.fail);
	});

	it('should return everest', (done) => {

		Parse.Cloud.run("challenge")
			.then((result)=>{
				expect(result).toBe("everest");
				done()
			},done.fail)
			.catch(done.fail)
	});

	it('passes when allowed by beforeSave', (done) => {

		const obj = new Parse.Object("PassClass");
		obj.set("mykey","value");
		obj.save()
			.then((result)=>{
				expect(result).toBeDefined()
				expect(result.className).toBe("PassClass");
				done()
			},done.fail)
			.catch(done.fail)
	});

	it('fails when blocked by beforeSave', (done) => {

		const obj = new Parse.Object("FailClass");
		obj.set("mykey","value");
		obj.save()
			.then(done.fail,(result)=>{
				expect(result).toBeDefined()
				expect(result.message).toBe("Saves to this class always fail")
				done()
			})
			.catch(done.fail)
	});

});


