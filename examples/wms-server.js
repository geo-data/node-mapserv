var path = require('path'),         // for file path manipulations
    http = require('http'),         // for the http server
    url = require('url'),           // for url parsing
    mapserv = require('../lib/mapserv'), // the Mapserv module
    port = 3000,                    // which port will the server run on?
    baseUrl = "http://localhost:" + port,         // what is the server url?
    mapfile = path.join(__dirname, 'wms-server.map'); // the location of the mapfile

// Instantiate a Map object from the mapfile
mapserv.Map.FromFile(mapfile, function handleMap(err, map) {
    if (err) throw err;         // error loading the mapfile

    // fire up a http server, handling all requests
    http.createServer(function handleMapRequest(req, res) {
        var urlParts = url.parse(decodeURIComponent(req.url)), // parse the request url
            // build a minimal CGI environment object (see
            // http://en.wikipedia.org/wiki/Common_Gateway_Interface#Environment_variables
            // for all possible variables)
            env = {
                'REQUEST_METHOD': req.method,
                'PATH_INFO': urlParts.pathname || "/",
                'QUERY_STRING': urlParts.query || ''
            };

        // delegate the request to the Map object, handling the response
        map.mapserv(env, function handleMapResponse(err, mapResponse) {
            console.log('Serving ' + req.url);

            if (err) {
                // the map returned an error: handle it
                if (mapResponse.data) {
                    // return the error as rendered by mapserver
                    res.writeHead(500, mapResponse.headers);
                    res.end(mapResponse.data);
                } else {
                    // A raw error we need to output ourselves
                    res.writeHead(500, {'Content-Type': 'text/plain'});
                    res.end(err.stack);
                }
                console.error(err.stack); // log the error
                return;
            }

            // send the map response to the client
            res.writeHead(200, mapResponse.headers);
            if (req.method !== 'HEAD') {
                res.end(mapResponse.data);
            } else {
                res.end();
            }
        });
    }).listen(port, "localhost");

    console.log(
        "Cascading WMS Server running at " + baseUrl + " - try the following URL:\n" +
            baseUrl + "/?mode=browse&template=openlayers&layer=GMRT\n" +
            "or point a WMS client at " + baseUrl + "/?"
    );
});
