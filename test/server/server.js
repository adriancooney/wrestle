/*
 * Example server for wrestle tests
 */
var crypto = require("crypto"),
	express = require("express"),
	app = express();

app.use(express.logger());
app.use(express.bodyParser());
app.use(express.static(__dirname + "/../../"));

/*
 * Extremely simplisitic Models
 */
var db = {
	users: [{
		username: "foo",
		name: "Steve",
		password: "bar"
	},

	{
		username: "raw",
		name: "Thomas",
		password: "root"
	},

	{
		username: "boo",
		name: "Adrian",
		password: "whisper"
	},

	{
		username: "admin",
		name: "Johnny",
		password: "chair"
	},

	{
		username: "mac",
		name: "Michael",
		password: "cat"
	}],

	sessions: []
}

function login(username, password) {
	var user;
	if(db.users.some(function(_user) {
		if(_user.username == username && _user.password == password) return user = _user;
	})) return user;
	else return false;
}

function session(user) {
	var key = crypto.createHash("md5").update(user.username + user.password).digest("hex"),
		session = {
			session: key,
			user: user
		};

	db.sessions.push(session);

	return session;
}

/*
 * API continuity functions
 */
app.use(function(req, res, next) {
	res.encode = function(object) {
		var meta = {
			code: 200,
			error: false
		};

		object["meta"] = meta;

		res.json(200, object);
	};

	res.fail = function(code, message) {
		res.json(code, {
			meta: {
				code: code,
				error: true,
				message: message
			}
		})
	};

	next();
});

/*
 * Middleware
 */
function authorize(req, res, next) {
	var session = req.query.session || req.body.session;

	if(session) {
		if(db.sessions.some(function(_session) {
			if(_session.session == session) return true;
		})) next();
		else res.fail(401, "Bad session key.");
	} else res.fail(400, "No session key.");
}

/*
 * Routes
 */
app.post("/user", function(req, res) {
	if(!req.body.username || !req.body.password) res.fail(400, "Not all required post parameters sent.");
	else {
		var user = {
			username: req.body.username,
			password: req.body.password,
			name: req.body.name
		};

		db.users.push(user);

		res.encode({
			user: {
				username: user.username,
				name: user.name || "",
				id: db.users.length - 1
			}
		});
	}
});

app.post("/login", function(req, res) {
	if(!req.body.username || !req.body.password) res.fail(400, "No username or password in POST parameters.");
	else {
		var user = login(req.body.username, req.body.password);

		if(user) {
			var _session = session(user);

			res.encode(_session);
		} else res.fail(400, "Invalid user credentials.");
	}
});

app.put("/user/:id", authorize, function(req, res) {
	var user = db.users[parseInt(req.params.id)];

	for(var param in req.body) user[param] = req.body[param];

	res.encode({
		user: user
	});
});

app.delete("/user/:id", authorize, function(req, res) {
	db.users.splice(req.params.id, req.params.id + 1);

	res.encode({});
});

app.get("/users", function(req, res) {
	res.encode({
		users: db.users.map(function(o) { delete o.password; return o; })
	});
});

app.get("/user/:id", function(req, res) {
	if(req.params.id) {
		var user = db.users[req.param.id];

		if(user) res.encode(user);
		else res.fail(404, "User does not exist");
	} else res.fail(400, "Bad request.");
});

app.get("/preferences", authorize, function(req, res) {
	res.encode({
		notifications: true
	});
});

app.get("/404", function(req, res) {
	res.fail(404, "Resource not found.")
});

app.listen(8181);