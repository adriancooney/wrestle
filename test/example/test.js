/*
 * Example server test spec with wrestle
 */
wrestle.define("url", "http://localhost:8181");

/*
 * An API schema
 */
wrestle.response.schema("post", 200, {
	meta: {
		code: 200,
		error: false
	}
});

wrestle.headers.schema({
	"X-API-Unit-Testing": "True"
})

/*
 * Define some example data
 */
wrestle.define({
	username: "floob",
	password: "toot",
	name: "ruby"
})

wrestle.describe(function() {/*
	Create a new user.
*/}).post("/user", {
	username: ":username",
	password: ":password",
	name: ":name"
}).expect({
	user: {
		username: String,
		name: String,
		id: Number
	}
}, function(err, code, data) {
	wrestle.define("id", data.user.id);
});

/*
 * Login and retrieve session key.
 */
wrestle.describe("Login and generate a session")
.post("/login", {
	username: ":username",
	password: ":password"
}).expect({
	session: /[0-9a-z]{32}/, //MD5 hash
}, function(err, code, data) {
	wrestle.define("session", data.session);
});

/*
 * Update a user
 */
wrestle.put("/user/:id", {
	username: ":username",
	password: "nope",
	session: ":session"
}).expect(200, function() {
	wrestle.define("password", "nope");
});

/*
 * Delete a user
 */
wrestle.delete("/user/:id", {
	session: ":session"
}).expect(200);

/*
 * I WANT TO FAIL. MAKE ME FAIL.
 */
wrestle.get("/fail").expect({
	a: 1
});

/*
 * Get user preferences
 */
wrestle.get("/preferences", {
	session: ":session"
}).expect({
	notifications: Boolean
});

/*
 * Deny access unless session key 
 */
wrestle.get("/preferences").expect(400);

/*
 * Deny access unless valid session key
 */
wrestle.get("/preferences", {
	session: "nope"
}).expect(401);

/*
 * Get a list of users
 */
wrestle.get("/users").expect({
	users: [{
		username: String,
		name: String
	}]
});

wrestle.get("/404").expect(404);