resteasy.define("url", "http://localhost:8181");

resteasy.post("/user").expect(200, {
	a: 1
});

resteasy.get("/404").expect(404);