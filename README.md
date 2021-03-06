Simple Proxy
===========

A really, really simple HTTP proxy for debugging things.  Like, two-source-files simple.

Its default behavior is to modify cache headers, but it can be tweaked to do whatever you want
to proxied responses.  Mostly it's useful for

  * Coding against a development server that is giving inappropriate caching instructions to the browser, where you want to be sure that what you're seeing is fresh bits
  * Caching content, to, say, remove back-end performance issues from testing the effect of cache headers or compression

This is a quick-n-dirty utility for changing some aspects of HTTP responses from a server without actually having to modify that server.  The model for using it is that you modify
it to do what you need - it is very simple to make that easy.

Needless to say, it is not intended for use in any sort of production environment.


Requirements
------------

Node.js 0.8 or greater.


Default Behavior
----------------

By default it proxies localhost port 8888.  You can pass a URL to it on the command-line to have it proxy something else.

By default it simply proxies another host, and munges the HTTP headers to ensure the browser does not use cached copies of anything.  Of course, you can change that to do whatever you want.

By default it adds/replaces the following:

	Pragma: no-cache
	Cache-Control: no-cache, no-store
	Expires: Tue, 2 Jan 1990, 00:00:00 GMT

It is not meant to be fast (it's defeating caching, after all!).


Modifying It
------------

To modify header behavior, simply pass a different function for the ``headerConverter`` parameter to the ``ProxyServer`` constructor.  Or edit the function ``handleHeaders`` in
``proxy-server.js``.

For example, say we want to add a header ``X-My-Header: Foo`` to every request.
Find the line

    var proxy = new proxyModule.ProxyServer ( config );

and replace it like this:

    function addAHeader ( httpResponse, responseHeaders, requestToProxy ) {
        proxyModule.handleHeaders.apply ( this, arguments );
        responseHeaders['X-My-Header'] = 'Foo';
    }

    var proxy = new proxyModule.ProxyServer ( config, null, addAHeader );


To introduce other behavior (for example, in-memory caching), do that in front of the call to proxy.dispatch.
The syntax using ``proxy.dispatch.apply({req : req, res : res}, req, res)`` is for compatibility with a 
number of routers.

License
-------

MIT License - basically: Do what you want with it.

