/*
 * wrestle browser interface. This file includes
 * definition for wrestle#httpRequest and the GUI
 * for the browser testing suite.
 */
wrestle.httpRequest = function(url, method, data, callback) {
	if(!url || !method || !callback) throw new Error("Please supply all params for wrestle#httpRequest.")
	var request = new XMLHttpRequest();

	request.open(method.toUpperCase(), url);

	if(data) {
		if(method == "get") url = wrestle.toURL(url, data);
		else {
			request.setRequestHeader("content-type", "application/x-www-form-urlencoded; charset=utf-8");
		}
	}

	request.onreadystatechange = function(event) {
		if(request.readyState == 4) {
			// Since wrestle currently only supports JSON APIs, we convert to json
			var json, err;
			try {
				json = JSON.parse(request.responseText);
			} catch(e) {
				err = e;
			} finally {
				callback(err, request.status, err ? request.responseText : json);
			}
		}
	};


	request.send((method !== "get" && data) ? wrestle.queryString(data) : undefined);
};

wrestle.addEventListener("begin", function() {
	console.log("Beginning tests.");
});

wrestle.addEventListener("end", function(report) {
	console.log("Testing complete. %c" + report.passed + " passed. %c" + report.failed + " failed. %c" + report.total + " in total.", "color: green", "color: red", "color: black");
});

wrestle.addEventListener("start", function(test) {
	console.group("Test #" + (test.index + 1) + ": " + test.type.toUpperCase() + " " + test.url);
});

wrestle.addEventListener("finish", function() {
	console.groupEnd();
});

wrestle.addEventListener("pass", function(test, data) {
	console.log("%cTest passed.", "color: green", data);
});

wrestle.addEventListener("fail", function(test, err) {
	console.log("%cTest failed.", "color: #d20e0e", err.message);
});

document.addEventListener("DOMContentLoaded", function() {
	wrestle.begin();
});