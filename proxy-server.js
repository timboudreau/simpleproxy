var http = require ( 'http' ),
        https = require ( 'https' ),
        os = require ( 'os' ),
        util = require ( 'util' ),
        url = require ( 'url' );

function error ( res, err ) {
    res.writeHead ( 500, {
        'Content-Type': 'text/plain; charset=UTF-8'
    } );
    res.end ( err ? err.stack || "" + err : "Error" );
}

function handleHeaders ( httpResponse, responseHeaders, requestToProxy ) {
    responseHeaders['Pragma'] = 'no-cache';
    responseHeaders['Cache-Control'] = 'no-cache, no-store';
    responseHeaders['Server'] = 'Proxy for ' + httpResponse.headers['server'];
    responseHeaders['Expires'] = 'Tue, 2 Jan 1990, 00:00:00 GMT';
}
exports.handleHeaders = handleHeaders;

// ProxyServer (class)
// ===========
// Creates a new proxy server.  Pass it
//
//  * A configuration, which might be a parsed URL (host, port properties)
//  * A location converter, which takes ``Location:`` headers and transforms them (may be null)
//  * A header converter which builds the headers for the response
exports.ProxyServer = function ( proxyConfig, convertLocation, headerConverter ) {
    var requestNumber = 0;
    if (!proxyConfig.protocol) {
        proxyConfig.protocol = 'http';
    }
    if (!proxyConfig.port) {
        proxyConfig.port = proxyConfig.protocol === 'https' ? 443 : 80;
    }
    if (!proxyConfig.methods) {
        proxyConfig.methods = ['get', 'head', 'post', 'put', 'delete', 'options'];
    }
    if (!proxyConfig.host) {
        proxyConfig.host = 'localhost';
    }
    if (!convertLocation) {
        convertLocation = function ( meth, pth ) {
            return pth;
        }
    }
    if (!headerConverter) {
        headerConverter = handleHeaders;
    }
    console.log ( "Proxy config: " + util.inspect ( proxyConfig ) );
    if (!proxyConfig.paths) {
        proxyConfig.paths = [/\/.*/];
    }

    // determines if this proxy server will service a request method/url
    this.accept = function ( meth, u ) {
        var uu = url.parse ( u );
        if (!uu.host || uu.host === proxyConfig.host) {
            if (!uu.protocol) {
                uu.protocol = 'http';
            }
            if (/.*?:$/.test ( uu.protocol )) {
                uu.protocol = /(.*?):$/.exec ( uu.protocol )[1];
            }

            if (uu.protocol !== ( proxyConfig.protocol || 'http' )) {
                return false;
            }
            if (!uu.port) {
                switch (uu.protocol) {
                    case 'http' :
                        uu.port = 80;
                        break;
                    case 'https' :
                        uu.port = 443;
                }
            }
            if (uu.host === proxyConfig.host && uu.port === proxyConfig.port) {
                var result = proxyConfig.protocol + '://' + os.hostname () + ":" + proxyConfig.proxyPort + uu.path;
                return result;
            }
        }
        return false;
    }

    // proxies a request.  this.req is the request, this.res is the response
    function proxy () {
        // Just proxies calls to jobserver, to avoid same-origin security issues
        var self = this;
        // Parse the URL and replace host/port/etc
        var u = url.parse ( self.req.url );
        u.host = proxyConfig.host;
        u.hostname = proxyConfig.host;
        u.port = proxyConfig.port;
        u.method = self.req.method;
        u.headers = self.req.headers;
        u.href = self.req.url;
        if (self.req.auth) {
            u.auth = self.req.auth;
        }
        var protocol = !proxyConfig.protocol ? http : proxyConfig.protocol === 'https' ? https : http;

        var num = requestNumber++;

        var closed = false;

        var proxyRequest = protocol.request ( u, function ( res ) {
            var hdrs = {}
            headerConverter ( res, hdrs, self.req );
            for (var key in res.headers) {
                if (key.toLowerCase () === 'location') {
                    var val = res.headers[key];
                    var nue = convertLocation ( self.req.method, val );
                    if (nue) {
                        hdrs[capitalize ( key )] = nue;
                    } else {
                        hdrs[capitalize ( key )] = val;
                    }
                } else {
                    // XXX this will fail on duplicate headers
                    if (typeof hdrs[capitalize ( key )] === 'undefined') {
                        hdrs[capitalize ( key )] = res.headers[key];
                    }
                }
            }
            hdrs['Host'] = os.hostname ();
            console.log ( num + ': ' + res.statusCode + " " +
                    self.req.method + " " + self.req.url );

            self.res.writeHead ( res.statusCode, hdrs );
            res.pipe ( self.res );
            res.on ( 'end', function () {
                if (res.trailers) {
                    self.res.addTrailers ( res.trailers );
                }
                self.res.end ();
                closed = true;
            } );
            proxyRequest.on ( 'close', function () {
                self.res.end ();
                closed = true;
            } )
        } );
        proxyRequest.on ( 'error', function ( e ) {
            closed = true;
            error ( self.res, e );
        } );
        if (self.req.method.toLowerCase () === 'put' || self.req.method.toLowerCase () === 'post') {
            var outChunks = 1;
            self.req.on ( 'data', function ( data ) {
                proxyRequest.write ( data );
            } );
            self.req.on ( 'end', function () {
                proxyRequest.end ();
            } );
            if (proxyRequest.readable) {
                proxyRequest.resume ();
            } else {
                proxyRequest.end ();
            }
        } else {
            proxyRequest.end ();
        }
    }
    this.dispatch = proxy;
};

// Re-capitalizes downcased header names, so they're copied into the
// response sanely
function capitalize ( name ) {
    var x = /-/g;
    if (x.test ( name )) {
        var parts = name.split ( x );
        var result = [];
        for (var i = 0; i < parts.length; i++) {
            var part = parts[i];
            part = part.charAt ( 0 ).toUpperCase () + part.slice ( 1 );
            result.push ( part );
        }
        return result.join ( '-' );
    } else {
        return name.charAt ( 0 ).toUpperCase () + name.slice ( 1 );
    }
}
exports.capitalize = capitalize;
