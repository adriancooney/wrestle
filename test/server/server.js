var express = require("express"),
	app = express();

app.use(express.bodyParser());
app.use(express.static(__dirname + "/../../"));

var sampleData = {
	users: [{
		username: "foo",
		name: "Steve",
		password: "bar"
	},

	{
		username: "foo",
		name: "Steve",
		password: "bar"
	}]
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

function authorize(req, res, next) {
	if(sampleData.users.some(function(user) {
		if(user.username == req.body.username && user.password == req.body.password) return true;
	})) next();
	else res.fail(400, "Unauthorized: Please specify a user name and password in your post parameters.");
}

app.post("/user", function(req, res) {
	res.json({
		a: 1
	})
});

app.get("/404", function(req, res) {
	res.fail(404, "Resource not found.")
});

app.listen(8181);