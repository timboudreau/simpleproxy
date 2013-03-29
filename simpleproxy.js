#!/usr/bin/env node

var http = require ( 'http' ), proxyModule = require ( './proxy-server' ), url = require ( 'url' );

var config = {
    port: 8888
}

var arg = process.argv.slice ( 2 )[0];
if (arg) {
    var u = url.parse ( arg );
    config = u;
    if (!config.port) {
        config.port = 80;
    }
}

var proxy = new proxyModule.ProxyServer ( config )

http.createServer ( function ( req, res ) {
    var fake = {
        req: req,
        res: res
    };
    proxy.dispatch.apply ( fake, [req, res] );
} ).listen ( 9339, "", function () {
    console.log ( "Proxy server started on port 9339 proxying " + ( arg ? arg : 'localhost:' + config.port ) );
} );
