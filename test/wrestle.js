var assert = require("assert"),
	wrestle = require("../index.js").wrestle;

describe("wrestle", function() {

	describe("#define", function() {
		it("should define 'url'", function() {
			wrestle.define("url", "http://localhost:8181");
		});
	});

	describe("#retrieve", function() {
		it("should retrieve an existing variable", function() {
			wrestle.define("name", "adrian");
			assert.equal(wrestle.retrieve("name"), "adrian");
		});

		it("should retrieve an undefined variable", function() {
			assert.equal(wrestle.retrieve("unknown"), undefined);
		});
	});

	describe("#toURL", function() {
		var base = "http://localhost/"
		it("should encode a url with get parameters", function() {
			assert.equal(wrestle.toURL(base, {foo: 1, bar: "blue"}), base + "?foo=1&bar=blue");
			assert.equal(wrestle.toURL(base + "?data=null", {foo: 1, bar: "blue"}), base + "?data=null&foo=1&bar=blue")
		})
	});

	describe("#format", function() {
		it("should format with a defined variable", function() {
			wrestle.define("walter", "heisenberg");
			assert.equal(wrestle.format(":walter"), "heisenberg");
		});

		it("should throw an error for undefined variable", function() {
			assert.throws(function() {
				wrestle.format(":wut");
			});
		});
	});

	describe("#expand", function() {
		it("should expand an object of variables", function() {
			var o = wrestle.expand({
				name: ":name"
			});

			assert.equal(o.name, "adrian");
		});
	});

	describe("#schema", function() {
		it("should store a schema", function() {
			wrestle.schema("response", {});
			wrestle.schema("response", "post", {});
			wrestle.schema("response", 200, {});
			wrestle.schema("response", "post", 200, {});
		});

		it("should merge two schema's matching the same parameters", function() {
			wrestle.schema("response", {
				a: String
			});

			wrestle.schema("response", {
				b: String
			});
		});
	});

	describe("#prettySchema", function() {
		it("should convert a schema with types to a string'd object", function() {
			wrestle.prettySchema({
				name: String,
				age: /\d+/,
				array: [
					{
						name: String,
						age: Number
					}
				]
			});
		});
	});

	describe("#prettyResponse", function() {
		it("should convert a response object to better object", function() {
			wrestle.prettyResponse({
				name: "loopy",
				array: [{
					friend: "Anonymous"
				},{
					friend: "Anonymous"
				},{
					friend: "Anonymous"
				},{
					friend: "Anonymous"
				},{
					friend: "Anonymous"
				},{
					friend: "Anonymous"
				},{
					friend: "Anonymous"
				},{
					friend: "Anonymous"
				},{
					friend: "Anonymous"
				}]
			});
		});
	});

	describe(".response#schema", function() {
		it("should store a response schema", function() {
			wrestle.request.schema("post", {
				success: true
			});

			assert(wrestle.store["schema.request.post.*"])
		})
	});

	describe("#compileSchema", function() {
		it("should return a compiled schema for a specific test", function() {
			wrestle.response.schema("post", 200, {
				success: true
			});

			wrestle.response.schema(200, {
				name: "tom"
			});

			wrestle.response.schema(404, {
				error: true
			});

			wrestle.response.schema({
				age: [{
					name: String,
					friends: [{
						name: /.*/
					}]
				}]
			});

			var schema = wrestle.compileSchema({
				code: 200,
				type: "post"
			}, "response");
		});
	});

	describe("#setCookie", function() {
		it("should store a cookie", function() {
			wrestle.setCookie("rawr=1");
			wrestle.setCookie("foo=1; bar=1");

			assert.equal(wrestle.retrieve("cookie"), "rawr=1;foo=1");
		});

		it("should overwrite a cookie", function() {
			wrestle.define("cookie", ""); //Empty cookie
			
			wrestle.setCookie("foo=1");
			wrestle.setCookie("foo=5");

			assert.equal(wrestle.retrieve("cookie"), "foo=5");
		});
	});

	describe("#compare", function() {
		it("should compare the schema against object", function() {
			var test = wrestle.compare({
				name: String,
				age: Number,
				friend: {
					name: String,
					age: Number
				}
			}, {
				name: "tom",
				age: 12,
				friend: {
					name: "Gary",
					age: 11
				}
			});

			assert.equal(test, true);
		});

		it("should compare schema with nested array schema", function() {
			var test = wrestle.compare({
				persons: [
					{
						name: String
					}
				]
			}, {
				persons: [
					{
						name: "Tom",
						age: 12
					},
					{
						name: "Adrian",
						age: 12
					}
				]
			});

			assert.equal(test, true);
		});

		it("should compare schema with nested array types", function() {
			var test = wrestle.compare({
				nums: [Number],
				age: Number,
				friend: [{
					name: String,
					age: Number
				}]
			}, {
				nums: [1, 2, 3, 4],
				age: 12,
				friend: [{
					name: "Adrian",
					age: 15
				},
				{
					name: "Adrian",
					age: 15
				},
				{
					name: "Adrian",
					age: 15
				}]
			});

			assert.equal(test, true);
		});

		it("should throw an error for bad object vs schema", function() {
			assert.throws(function() {
				wrestle.compare({
					name: String
				}, {
					name: 1
				});
			}, Error);
		});
	});

	describe("#parameter", function() {
		it("should parameterize an object", function() {
			var parameter = wrestle.parameter({
				required: true
			});

			assert(parameter.__WRESTLE_PARAMETER);
		});
	});

	describe("#toTypeString", function() {
		it("should return the correct types", function() {
			assert.equal(wrestle.toTypeString(String), "String");
			assert.equal(wrestle.toTypeString(Function), "Function");
			assert.equal(wrestle.toTypeString(Number), "Number");
			assert.equal(wrestle.toTypeString(Array), "Array");
			assert.equal(wrestle.toTypeString(Boolean), "Boolean");
		});
	});

	describe("#isType", function() {
		it("should match types", function() {
			assert.equal(wrestle.isValue(String, "string"), true);
			assert.equal(wrestle.isValue(Array, []), true);
			assert.equal(wrestle.isValue(Object, {}), true);
			assert.equal(wrestle.isValue(Boolean, true), true);
			assert.equal(wrestle.isValue(Number, 1), true);
			assert.equal(wrestle.isValue(Boolean, 1), false);
		})
	});

	/*
	describe("Test Definition API", function() {
		this.timeout(15000);
		it("should create a new test and add to the queue", function() {
			var a = wrestle.post("/lol", {a : 1}).expect({}, function() {});

			assert(wrestle.queue[0]);
		});

		it("should create a test and run it", function(done) {
			var a = wrestle.get("/lolfoot", {a : 1}).expect(200, {}, function() {});
			var a = wrestle.get("/toot").expect(404);

			wrestle.addEventListener("end", function(report) {
				console.log("Done!", report);
				done();
			});

			wrestle.begin();
		});
	}); */
});