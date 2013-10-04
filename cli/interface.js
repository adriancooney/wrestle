var http = require("http"),
	URL = require("url"),
	color = require("colors"),
	resteasy = require("../index.js").resteasy;

/**
 * resteasy node HTTP interface
 */
resteasy.httpRequest = function(url, method, data, callback) {
	var headers = {};
	url = URL.parse(url);
	method = method.toLowerCase();

	if(data && method !== "get") {
		headers["content-type"] = "application/x-www-form-urlencoded; charset=utf-8";
	}

	var request = http.request({
		hostname: url.hostname,
		port: url.port,
		path: (method == "get" && data ? resteasy.toURL(url.path, data) : url.path),
		method: method.toUpperCase(),
		headers: headers
	}, function(res) {
		res.setEncoding("utf8");
		res.on("data", function(body) {
			var json, err;
			try {
				json = JSON.parse(body);
			} catch(e) {
				err = e;
			} finally {
				callback(err, res.statusCode, err ? body : json);
			}
		})
	});

	request.write((method !== "get" && data) ? resteasy.queryString(data) : "");
	request.end();
};

resteasy.on("begin", function() {
	console.log("Beginning tests.");
});

resteasy.on("end", function(report) {
	console.log("Testing complete.", (report.passed + " passed.").green, (report.failed + " failed.").red, report.total + " in total.");
});

resteasy.on("start", function(test) {
	console.log("Test #" + (test.index + 1) + ": " + test.type.toUpperCase() + " " + test.url);
});

resteasy.on("pass", function(test, data) {
	console.log("Test passed.".green);
});

resteasy.on("fail", function(test, err) {
	console.log("Test failed.".red, err.message);
});

module.exports = resteasy;