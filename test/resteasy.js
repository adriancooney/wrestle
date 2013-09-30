var assert = require("assert"),
	resteasy = require("resteasy").resteasy;

describe("resteasy", function() {

	describe("#define", function() {
		it("should define 'name'", function() {
			resteasy.define("name", "adrian");
		});
	});

	describe("#retrieve", function() {
		it("should create retrieve an existing variable", function() {
			assert.equal(resteasy.retrieve("name"), "adrian");
		});

		it("should retrieve an undefined variable", function() {
			assert.equal(resteasy.retrieve("unknown"), undefined);
		});
	});

	describe("#toURL", function() {
		var base = "http://localhost/"
		it("should encode a url with get parameters", function() {
			assert.equal(resteasy.toURL(base, {foo: 1, bar: "blue"}), base + "?foo=1&bar=blue");
			assert.equal(resteasy.toURL(base + "?data=null", {foo: 1, bar: "blue"}), base + "?data=null&foo=1&bar=blue")
		})
	});

	describe("#format", function() {
		it("should format with a defined variable", function() {
			resteasy.define("walter", "heisenberg");
			assert.equal(resteasy.format("$walter"), "heisenberg");
		});

		it("should throw an error for undefined variable", function() {
			assert.throws(function() {
				resteasy.format("$wut");
			});
		});
	});

	describe("#schema", function() {
		it("should store a schema", function() {
			resteasy.schema("response", {});
			resteasy.schema("response", "post", {});
			resteasy.schema("response", 200, {});
			resteasy.schema("response", "post", 200, {});
		});

		it("should merge two schema's matching the same parameters", function() {
			resteasy.schema("response", {
				a: String
			});

			resteasy.schema("response", {
				b: String
			});
		});
	});

	describe(".response#schema", function() {
		it("should store a response schema", function() {
			resteasy.response.schema("post", 200, {
				success: true
			});
		})
	});

	describe("#compileSchema", function() {
		it("should return a compiled schema for a specific test", function() {
			resteasy.response.schema("post", 200, {
				success: true
			});

			resteasy.response.schema(200, {
				name: "tom"
			});

			resteasy.response.schema({
				age: [{
					name: String,
					friends: [{
						name: /.*/
					}]
				}]
			});

			var schema = resteasy.compileSchema({
				code: 200,
				type: "post"
			}, "response");
		});
	});

	describe("#compare", function() {
		it("should compare the schema against object", function() {
			var test = resteasy.compare({
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
			var test = resteasy.compare({
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
			var test = resteasy.compare({
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
				resteasy.compare({
					name: String
				}, {
					name: 1
				});
			}, Error);
		});
	});

	describe("#toTypeString", function() {
		it("should return the correct types", function() {
			assert.equal(resteasy.toTypeString(String), "String");
			assert.equal(resteasy.toTypeString(Function), "Function");
			assert.equal(resteasy.toTypeString(Number), "Number");
			assert.equal(resteasy.toTypeString(Array), "Array");
			assert.equal(resteasy.toTypeString(Boolean), "Boolean");
		});
	});

	describe("#isType", function() {
		it("should match types", function() {
			assert.equal(resteasy.isValue(String, "string"), true);
			assert.equal(resteasy.isValue(Array, []), true);
			assert.equal(resteasy.isValue(Object, {}), true);
			assert.equal(resteasy.isValue(Boolean, true), true);
			assert.equal(resteasy.isValue(Number, 1), true);
			assert.equal(resteasy.isValue(Boolean, 1), false);
		})
	});

	describe("Test Definition API", function() {
		it("should create a new test and add to the queue", function() {
			var a = resteasy.post("/lol", {a : 1}).expect({}, function() {});

			assert(resteasy.queue[0]);
		});

		it("should create a test and run it", function() {
			var a = resteasy.get("/lol", {a : 1}).expect(200, {}, function() {});

			resteasy.begin();
		});
	});
});