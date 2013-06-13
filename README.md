# Node Mapserv

[![Build Status](https://secure.travis-ci.org/geo-data/node-mapserv.png)](http://travis-ci.org/geo-data/node-mapserv)

`node-mapserv` is a Node.js module which makes the functionality provided by
the traditional Mapserver `mapserv` CGI program available to Node code.

`node-mapserv` is best thought of as a wrapper around CGI `mapserv`: internally
it uses a C++ binding to shave away the thin layer representing the binary
`mapserv` CGI interface, replacing it with a javascript interface.  All the
underlying `mapserv` logic and code remain the same.

`node-mapserv` is *not* MapScript for Node.  Instead it provides a simple
declarative API for rendering mapserver mapfiles with the following benefits:

* All the considerable functionality of CGI `mapserv` are at your disposal:
  there's no need to reinvent the wheel (maybe just add a few spokes here and
  there!).

* Support for declarative mapfile programming: most of what can be accomplished
  imperatively using mapscript can be done declaratively by custom generating
  new mapfiles and tweaking existing mapfiles (see
  [this post](http://sgillies.net/blog/315/stop-using-mapscript/) for a more
  detailed discussion).

* Adherence to the Node non-blocking philosophy: operations involving I/O (such
  as parsing mapfiles and rendering maps) are performed asynchronously in child
  threads which keeps the main event loop snappy.  Rough benchmarks suggest
  performance is comparable to fastcgi mapserv (using `examples/wms-server.js`
  with a modified mapfile).

## Usage

It is assumed that you are familiar with
[using `mapserv`](http://mapserver.org/cgi/index.html) and
[creating mapfiles](http://mapserver.org/mapfile/index.html).

The API is simple and defines the following general pattern:

1. Instantiate an instance of the `Map` class from a mapfile on the filesystem
(using `Map.FromFile`) or a mapfile string (using `Map.FromString`).

2. Render the mapfile as many times as required using `Map.mapserv`. This
function emulates Mapserver CGI `mapserv` functionality and as such requires
the creation of CGI environment variables to define the request parameters.

The following example illustrates these steps:

```javascript
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
```

Editing the mapfile string and using it to instantiate new `Map` objects will
of course allow you to produce different maps.

The above example can be found in the package as `examples/hello-world.js`.
`examples/wms-server.js` provides a more full featured example that marries
`node-mapserv` with the stock Node `http` module to create a cascading WMS
server.  In addition it illustrates:

* How to pass a 'body' string to `Map.mapserv` representing the HTTP body of a
  request (e.g. used in HTTP POST and PUT requests).

* The use of the `mapserv.createCGIEnvironment` function used to generate a CGI
  environment from an `http.ServerRequest` object.

Versioning information is also available. From the Node REPL:

```
> var mapserv = require('mapserv');
> mapserv.versions
{ node_mapserv: '0.1.0',
  mapserver: '6.3-dev',
  mapserver_details: 'MapServer version 6.3-dev OUTPUT=PNG OUTPUT=JPEG SUPPORTS=PROJ SUPPORTS=AGG SUPPORTS=FREETYPE SUPPORTS=ICONV SUPPORTS=WMS_SERVER SUPPORTS=WMS_CLIENT SUPPORTS=FASTCGI SUPPORTS=THREADS INPUT=JPEG INPUT=POSTGIS INPUT=GDAL INPUT=SHAPEFILE' }
```

## Requirements

* Linux OS (although it should work on other Unices and ports to Windows and
  other platforms supported by both Node and Mapserver should be possible:
  patches welcome!).

* Node.js >=0.8

* Mapserver >= 6.2 (If you are using `Map.FromString` ensure that you are using
  Mapserver >= 6.3 or alternatively you have applied
  [this patch](https://github.com/mapserver/mapserver/commit/e9e48941e9b02378de57a8ad6c6aa0d070816b06).
  Mapserver *must* be compiled with support for threads.

## Installation

* Ensure [Node.js](http://nodejs.org) and [Mapserver](http://www.mapserver.org)
  are available on your system.  Mapserver will need to have been built from
  source with the source directory still available.

* Point `node-mapserv` to the Mapserver source directory.  It uses the build
  files to configure itself during installation.  E.g.

    `npm config set mapserv:build_dir /tmp/mapserver-6.2`

* Get and install `node-mapserv`:

    `npm install mapserv`

* Optionally test that everything is working as expected (recommended):

   `npm test mapserv`

Alternatively if you are developing or debugging you can bypass `npm` and use
`node-gyp` directly (which `npm` itself calls). For the latest version of
`node-mapserv`, the above instructions roughly translate to:

    git clone https://github.com/geo-data/node-mapserv.git
    cd node-mapserv

    npm_config_mapserv_build_dir=/tmp/mapserver-6.2 \
    node-gyp --debug configure build

    npm install vows
    ./node_modules/.bin/vows --spec ./test/mapserv-test.js

## Recommendations

* Avoid using Mapserver features that are not thread safe: `node-mapserv` makes
  heavy use of threads and although this is safe for core mapserver operations,
  some extended features should be avoided.  See the
  [Mapserver FAQ](http://mapserver.org/faq.html?highlight=threads#is-mapserver-thread-safe)
  and GitHub issues #4041 and #4044 for further details.

* Become familiar with Mapserver
  [runtime substitution](http://mapserver.org/cgi/runsub.html): this allows you
  to alter portions of a mapfile based on data passed via a CGI request.

* Use the
  [`PROCESSING "CLOSE_CONNECTION=DEFER"`](http://mapserver.org/mapfile/layer.html#index-49)
  directive in you mapfiles in order to cache data connections where possible:
  `Map` instances wrap persistent mapfile data structures and can therefore
  benefit from pooling persistent data connections in the same way as fastcgi
  mapserv.

* Check out [`node-mapcache`](https://npmjs.org/package/mapcache): this can
  work well in combination with `node-mapserv` for generating tiled maps.

## Bugs

Please add bugs or issues to the
[GitHub issue tracker](https://github.com/geo-data/node-mapserv).

## Documentation

Doxygen based documentation is available for the C++ bindings. See
`doc/README.md` for details.

## Licence

BSD 2-Clause (http://opensource.org/licenses/BSD-2-Clause).

## Contact

Homme Zwaagstra <hrz@geodata.soton.ac.uk>
