/******************************************************************************
 * Copyright (c) 2012, GeoData Institute (www.geodata.soton.ac.uk)
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *
 *  - Redistributions of source code must retain the above copyright notice,
 *    this list of conditions and the following disclaimer.
 *
 *  - Redistributions in binary form must reproduce the above copyright notice,
 *    this list of conditions and the following disclaimer in the documentation
 *    and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
 * LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
 * CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
 * SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 * CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
 * ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
 * POSSIBILITY OF SUCH DAMAGE.
 *****************************************************************************/

/**
 * Set up Mapserv as a WMS server
 *
 * This provides an example of how to use the Mapserv module in combination
 * with the Node HTTP module to create a Cascading WMS server.  The resulting
 * WMS server acts as a proxy to the Marine Geo WMS service.  It can be
 * accessed using a standard WMS client or by using the built in mapserver
 * OpenLayers client.
 */

var path = require('path'),         // for file path manipulations
    http = require('http'),         // for the http server
    mapserv = require('../lib/mapserv'), // the Mapserv module
    host = 'localhost',                  // the server name
    port = 3000,                         // which port will the server run on?
    baseUrl = "http://" + host + ":" + port, // what is the server url?
    mapfile = path.join(__dirname, 'wms-server.map'); // the location of the mapfile

// Instantiate a Map object from the mapfile
mapserv.Map.FromFile(mapfile, function handleMap(err, map) {
    if (err) throw err;         // error loading the mapfile

    // fire up a http server, handling all requests
    http.createServer(function handleMapRequest(req, res) {
        var env = mapserv.createCGIEnvironment(req),
            buffer;             // a `Buffer` object for the request body

        // buffer any request body
        req.once('data', function onFirstData(chunk) {
            buffer = chunk;     // the initial chunk

            // deal with the rest of the message body
            req.on('data', function onData(chunk) {
                buffer.concat([chunk], 1);
            });
        });

        // no more request data: prepare our response
        req.on('end', function onEnd() {
            // delegate the request to the Map object, handling the response
            map.mapserv(env, buffer, function handleMapResponse(err, mapResponse) {
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
        });
    }).listen(port, "localhost");

    console.log(
        "Cascading WMS Server running at " + baseUrl + " - try the following URL:\n" +
            baseUrl + "/?mode=browse&template=openlayers&layer=GMRT\n" +
            "or point a WMS client at " + baseUrl + "/?"
    );
});
