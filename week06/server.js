const http = require("http");

const server = http.createServer((req, res) => {
    console.log("request received");
    console.log(req);
    console.log(req.headers);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('X-Foo', 'bar');
    res.setHeader('custom', 'barsssss');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end(`<html maaa=a>
<head>
</head>
<body>
<div>
<img id="myid">
<img />
</div>
</body>
</html>`);
})

server.listen(8088);