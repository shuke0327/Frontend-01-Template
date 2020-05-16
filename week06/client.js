const net = require('net');
const parser = require('./parser.js');
class Request {
    // method, url = host + port + path
    // body: key/value
    // headers
    constructor(options) {
        this.method = options.method || "GET"
        this.host = options.host;
        this.port = options.port || 80;
        this.path = options.path || "/";
        this.headers = options.headers || {};
        this.body = options.body || {};
        if (!this.headers["Content-Type"]) {
            this.headers["Content-Type"] = "application/x-www-form-urlencoded"
        }

        if (this.headers["Content-Type" === "application/json"])
            this.bodyText = JSON.stringify(this.body);
        else if (this.headers["Content-Type"] === "application/x-www-form-urlencoded")
            this.bodyText = Object.keys(this.body).map(key => `${key}=${encodeURIComponent(this.body[key])}`).join('\r\n');
        this.headers["Content-Length"] = this.bodyText.length;
    }

    toString() {
        return `${this.method} ${this.path} HTTP/1.1\r
${Object.keys(this.headers).map(key => `${key}: ${this.headers[key]}`).join('\r\n')}\r
\r
${this.bodyText}`
    }
    send(connection) {
        return new Promise((resolve, reject) => {
            const parser = new ResponseParser;
            if (connection)
                connection.write(this.toString());
            else connection = net.createConnection({
                host: this.host,
                port: this.port
            }, () => {
                console.log('=====================');
                console.log('= Connection Write Data =');
                console.log('=====================');
                connection.write(this.toString());
                console.log(this.toString());
            });
            // process data
            connection.on('data', (data) => {
                parser.receive(data.toString());
                if (parser.isFinished) {
                    resolve(parser.getResponse);
                }
                // print statusLine from response
                console.log(parser.statusLine);
                // print headerLine from response
                console.log("\n");
                console.log("=================");
                console.log("==RAW   VERSION==");
                console.log("=================");
                console.log("\n");
                console.log(parser.headers);
                console.log("\n");
                console.log("=================");
                console.log("==TIDY  VERSION==");
                console.log("=================");
                console.log("\n");
                console.log(Object.keys(parser.headers).map((key) => `${key}${parser.headers[key]}`).join('\r\n'));
                // resolve(data.toString());
                connection.end();
            });
            // process error
            connection.on('err', (err) => {
                reject(err);
                connection.end();
            });
        });
    }
}

class Response {

}

class ResponseParser {
    // status line
    // HTTP/1.1 200 OK
    // headers
    //   Transfer-Encoding: chunked
    //   (prefered by nodejs)
    // body
    // 字符流的处理
    constructor() {
        this.WAITING_STATUS_LINE = 0;
        this.WAITING_STATUS_LINE_END = 1;
        this.WAITING_HEADER_NAME = 2;
        this.WAITING_HEADER_SPACE = 3;
        this.WAITING_HEADER_VALUE = 4;
        this.WAITING_HEADER_LINE_END = 5;
        this.WAITING_HEADER_BLOCK_END = 6;
        this.WAITING_BODY = 7;

        this.current = this.WAITING_STATUS_LINE;
        this.statusLine = "";
        this.headers = {};
        this.headerName = "";
        this.headerValue = "";
        this.bodyParser = null;
    }

    get isFinished() {
        return this.bodyParser && this.bodyParser.isFinished;
    }

    get getResponse() {
        this.statusLine.match(/HTTP\/1.1 ([0-9]+) ([\s\S]+)/);
        return {
            statusCode: RegExp.$1,
            statusText: RegExp.$2,
            headers: this.headers,
            body: this.bodyParser.content.join('')
        }
    }

    receive(string) {
        for (let i = 0; i < string.length; i++) {
            this.receiveChar(string.charAt(i));
        }

    }

    receiveChar(char) {
        // process status line
        if (this.current === this.WAITING_STATUS_LINE) {
            if (char === '\r') {
                this.current = this.WAITING_STATUS_LINE_END;
            }
            if (char === '\n') {
                this.current = this.WAITING_HEADER_NAME;
            } else {
                this.statusLine += char;
            }
        }
        // change status line end 
        else if (this.current === this.WAITING_STATUS_LINE_END) {
            if (char === '\n') {
                this.current = this.WAITING_HEADER_NAME;
            }
        }       // process Header Name
        else if (this.current === this.WAITING_HEADER_NAME) {
            if (char === ':') {
                this.current = this.WAITING_HEADER_SPACE;
            } else if (char === '\r') {
                this.current = this.WAITING_HEADER_BLOCK_END;
                if (this.headers['Transfer-Encoding'] === 'chunked') {
                    this.bodyParser = new TrunkedBodyParser();
                }
            } else {
                this.headerName += char;
            }
        }

        // process Header space
        else if (this.current === this.WAITING_HEADER_SPACE) {
            if (char === ' ') {
                this.current = this.WAITING_HEADER_VALUE;
            }
        }

        // header value
        else if (this.current === this.WAITING_HEADER_VALUE) {
            if (char === '\r') {
                this.current = this.WAITING_HEADER_LINE_END;
                this.headers[this.headerName] = this.headerValue;
                this.headerName = "";
                this.headerValue = "";
            } else {
                this.headerValue += char;
            }
        }

        // continue to process another header name
        else if (this.current === this.WAITING_HEADER_LINE_END) {
            if (char === '\n') {
                this.current = this.WAITING_HEADER_NAME;
            }
            else {

            }
        }
        else if (this.current === this.WAITING_HEADER_BLOCK_END) {
            if (char === '\n') {
                this.current = this.WAITING_BODY;
            }
        }
        else if (this.current === this.WAITING_BODY) {
            // forward received character to bodyParser
            this.bodyParser.receiveChar(char);
        }
    }
}

class TrunkedBodyParser {
    constructor() {
        this.WAITING_LENGTH = 0;
        this.WAITING_LENGTH_LINE_END = 1;
        this.READING_TRUNK = 2;
        this.WAITING_NEW_LINE = 3;
        this.WAITING_NEW_LINE_END = 4;
        this.length = 0;
        this.isFinished = false;
        this.content = [];
        this.current = this.WAITING_LENGTH;
    }

    receiveChar(char) {
        if (this.current === this.WAITING_LENGTH) {
            if (char === '\r') {
                if (this.length === 0) {
                    //     console.log(this.content);
                    //     console.log("//////////");
                    this.isFinished = true;
                }
                this.current = this.WAITING_LENGTH_LINE_END;
            } else {
                this.length *= 16;
                this.length += parseInt(char, 16);
            }
        } else if (this.current === this.WAITING_LENGTH_LINE_END) {
            if (char === '\n') {
                this.current = this.READING_TRUNK;
            }
        } else if (this.current == this.READING_TRUNK) {
            this.content.push(char);
            this.length--;
            if (this.length === 0) {
                this.current = this.WAITING_NEW_LINE;
            }
        } else if (this.current === this.WAITING_NEW_LINE) {
            if (char === '\r') {
                this.current = this.WAITING_NEW_LINE_END;
            }
        } else if (this.current === this.WAITING_NEW_LINE_END) {
            if (char === '\n') {
                this.current = this.WAITING_LENGTH;
            }
        }
    }
}

void async function () {
    let request = new Request({
        method: "POST",
        host: "127.0.0.1",
        path: "/",
        port: 8088,
        headers: {
            ["X-Foo2"]: "hello,world"
        },
        body: {
            name: "Leaner",
            age: "19",
            sex: "male"
        }
    });
    let response = await request.send();
    let dom = parser.parseHTML(response.body);
    console.log('=====================');
    console.log('==== Parsed Data ====');
    console.log('=====================');
}();