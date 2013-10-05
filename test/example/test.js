resteasy.define("url", "http://localhost:8181");

/*
 * An API schema
 */
resteasy.schema(200, {
	meta: {
		code: 200,
		error: false
	}
});

/*
 * Define some example data
 */
resteasy.define({
	username: "floob",
	password: "toot",
	name: "ruby"
})

/*
 * Create a new user.
 */
resteasy.post("/user", {
	username: "$username",
	password: "$password",
	name: "$name"
}).expect({
	user: {
		username: String,
		name: String
	}
});

/*
 * Login and retrieve session key.
 */
resteasy.post("/login", {
	username: "$username",
	password: "$password"
}).expect({
	session: /[0-9a-z]{32}/ //MD5 hash
}, function(err, code, data) {
	resteasy.define("session", data.session);
});

/*
 * Get user preferences
 */
resteasy.get("/preferences", {
	session: "$session"
}).expect({
	notifications: Boolean
})

/*
 * Deny access unless session key 
 */
resteasy.get("/preferences").expect(400);

/*
 * Deny access unless valid session key
 */
resteasy.get("/preferences", {
	session: "nope"
}).expect(401);

/*
 * Get a list of users
 */
resteasy.get("/users").expect({
	users: [{
		username: String,
		name: String
	}]
});