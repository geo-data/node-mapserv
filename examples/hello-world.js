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
 * A basic introduction to Node Mapserv
 *
 * This illustrates the core API and general usage pattern provided by the
 * Mapserv module by generating a map response and saving it to a file.  It
 * shows how to:
 *
 * - instantiate a `Map` object from a mapfile string
 * - set up a minimal CGI environment for specifying map requests
 * - generate a map response using the `Map.mapserv` method
 * - access the `headers` and `data` properties in the map response
 */

var mapserv = require('../lib/mapserv'), // the Mapserv module
    fs = require('fs'),                  // for filesystem operations

    // A minimalist mapfile string
    mapfile = "MAP \
  NAME hello \
  STATUS ON \
  EXTENT 0 0 4000 3000 \
  SIZE 400 300 \
  IMAGECOLOR 200 255 255 \
  LAYER \
    NAME 'credits' \
    STATUS DEFAULT \
    TRANSFORM FALSE \
    TYPE ANNOTATION \
    FEATURE \
      POINTS \
        200 150 \
      END \
      TEXT 'Hello world.  Mapserver rocks.' \
    END \
    CLASS \
      LABEL \
        TYPE BITMAP \
        COLOR 0 0 0 \
      END \
    END \
  END \
END";

// Instantiate a Map object from the mapfile string. You could use
// `mapserv.Map.FromFile` instead.
mapserv.Map.FromString(mapfile, function handleMap(err, map) {
    if (err) throw err;         // error loading the mapfile

    // a minimal CGI environment
    var env = {
        REQUEST_METHOD: 'GET',
        QUERY_STRING: 'mode=map&layer=credits'
    };

    map.mapserv(env, function handleMapResponse(err, mapResponse) {
        if (err) {
            throw err;          // error generating the response
        }

        // If the response is an image, save it to a file, otherwise write it
        // to standard output.
        var contentType = mapResponse.headers['Content-Type'][0]; // get the content type from the headers
        if (contentType.substr(0, 5) === 'image') {
            var filename = 'output.' + contentType.substr(6); // get the file extension from the content type
            fs.writeFile(filename, mapResponse.data, function onWrite(err) {
                if (err) {
                    throw err;  // error writing to file
                }
                console.log('Mapserver response written to `%s`', filename);
            });
        } else {
            console.log(mapResponse.data.toString());
        }
    });
});
