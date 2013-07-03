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
 * Mapserv test harness
 *
 * This test harness uses 'vows' (http://vowsjs.org) to exercise the
 * Mapserv API. It can be run directly using vows:
 *
 *    vows --spec test/mapserv-test.js
 *
 * or indirectly using 'npm':
 *
 *    npm test
 */

var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    buffer = require('buffer'),
    mapserv;

// Load node-mapserv.  We cause a failure the first time to ensure that certain
// code branches in module initialisation are run.
try {
    // an invalid file path (checked in `msDebugInitFromEnv()`)...
    process.env['MS_ERRORFILE'] = '/oops';
    // ...causing module initialisation to fail
    mapserv = require('../lib/mapserv');
} catch (e) {
    delete process.env['MS_ERRORFILE']; // clear the problem
    mapserv = require('../lib/mapserv'); // should be ok
}

// Exercise cleanup code by calling the V8 garbage collector.  This is only
// available if node has been called with the `--expose-gc` option.
if (typeof(global.gc) == 'function') {
    process.on('exit', function onExit() {
        global.gc();
    });
}

// Dummy request object used for testing `createCGIEnvironment`
function dummyRequest() {
    var req = {
        url: 'http://example.com/foo/bar?key=value',
        httpVersion: '1.1',
        method: 'POST',
        connection: {
            remoteAddress: '127.0.0.0'
        },
        headers: {
            'content-length': '22',
            'content-type': 'application/x-www-form-urlencoded',
            host: 'localhost:80',
            accept: '*/*',
            authorization: 'Basic WovZwuYYN2mWNO5='
        }
    };

    return req;
}

// Ensure a Mapserver error has the expected interface
function assertMapserverError(expected, actual, noStack) {
    assert.instanceOf(actual, Error);
    assert.equal(actual.name, 'MapserverError');
    assert.include(actual, 'code');
    assert.include(actual, 'category');
    assert.include(actual, 'routine');
    assert.include(actual, 'isReported');
    if (!noStack) {
        assert.include(actual, 'errorStack');
        assert.isArray(actual.errorStack);
    }
    assert.isNumber(actual.code);
    assert.isString(actual.routine);
    assert.strictEqual(actual.routine.length > 1, true);
    assert.isString(actual.category);
    assert.strictEqual(actual.category.length > 1, true);
    assert.isBoolean(actual.isReported);
    assert.equal(expected, actual.message);
}                

vows.describe('mapserv').addBatch({
    // Ensure the module has the expected interface

    'The mapserv module': {
        topic: mapserv,

        'should have a `Map` object': {
            topic: function (mapserv) {
                return mapserv.Map;
            },
            'which is a function': function (Map) {
                assert.isFunction(Map);
            },
            'which has the property `FromFile`': {
                topic: function (Map) {
                    return Map.FromFile;
                },
                'which is a factory method': function (FromFile) {
                    assert.isFunction(FromFile);
                }
            },
            'which has the property `FromString`': {
                topic: function (Map) {
                    return Map.FromString;
                },
                'which is a factory method': function (FromString) {
                    assert.isFunction(FromString);
                }
            },
            'which has the prototype property `mapserv`': {
                topic: function (Mapserv) {
                    return Mapserv.prototype.mapserv || false;
                },
                'which is a method': function (mapserv) {
                    assert.isFunction(mapserv);
                }
            },
            'which acts as a constructor': {
                'requiring at least one argument': function (Map) {
                    var err;
                    try {
                        err = new Map();
                    } catch (e) {
                        err = e;
                    }
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, 'usage: new Map(mapObj)');
                },
                'which cannot be instantiated from javascript': function (Map) {
                    var err;
                    try {
                        err = new Map('test');
                    } catch (e) {
                        err = e;
                    }
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, 'Argument 0 invalid');
                },
                'which throws an error when called directly': function (Map) {
                    var err;
                    try {
                        err = Map();
                    } catch (e) {
                        err = e;
                    }
                    assert.instanceOf(err, Error);
                    assert.equal(err.message, 'Map() is expected to be called as a constructor with the `new` keyword');
                }
            }
        },

        'should have a `versions` property': {
            topic: function (mapserv) {
                return mapserv.versions;
            },
            'which is an object': function (versions) {
                assert.isObject(versions);
            },
            'which contains the `node-mapserv` version': {
                topic: function (versions) {
                    return versions.node_mapserv;
                },
                'is a string': function (version) {
                    assert.isString(version);
                    assert.isTrue(version.length > 0);
                },
                'which is the same as that in `package.json`': function (version) {
                    var contents = fs.readFileSync(path.join(__dirname, '..', 'package.json')),
                        json = JSON.parse(contents),
                        pversion = json.version;
                    assert.equal(version, pversion);
                }
            },
            'which contains the `mapserver` version': {
                topic: function (versions) {
                    return versions.mapserver;
                },
                'as a string': function (version) {
                    assert.isString(version);
                    assert.isTrue(version.length > 0);
                }
            },
            'which contains the `mapserver_numeric` version': {
                topic: function (versions) {
                    return versions.mapserver_numeric;
                },
                'as an integer': function (version) {
                    assert.isNumber(version);
                    assert.isTrue(version > 60200); // the minimum supported version
                }
            },
            'which contains the `mapserver_details`': {
                topic: function (versions) {
                    return versions.mapserver_details;
                },
                'as a string': function (version) {
                    assert.isString(version);
                    assert.isTrue(version.length > 0);
                }
            }
        },

        'should have a `createCGIEnvironment` property': {
            topic: function (mapserv) {
                return mapserv.createCGIEnvironment;
            },
            'which is a function': function (func) {
                assert.isFunction(func);
            }
        }
    }
}).addBatch({
    // Ensure `FromFile` has the expected interface

    '`Map.FromFile`': {
        topic: function () {
            return mapserv.Map.FromFile;
        },

        'works with two valid arguments': {
            topic: function (FromFile) {
                return typeof(FromFile('non-existent-file', function(err, map) {
                    // do nothing
                }));
            },
            'returning undefined': function (retval) {
                assert.equal(retval, 'undefined');
            }
        },
        'fails with one argument': {
            topic: function (FromFile) {
                try {
                    return FromFile('first-arg');
                } catch (e) {
                    return e;
                }
            },
            'by throwing an error': function (err) {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'usage: Map.FromFile(mapfile, callback)');
            }
        },
        'fails with three arguments': {
            topic: function (FromFile) {
                try {
                    return FromFile('first-arg', 'second-arg', 'third-arg');
                } catch (e) {
                    return e;
                }
            },
            'by throwing an error': function (err) {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'usage: Map.FromFile(mapfile, callback)');
            }
        },
        'requires a string for the first argument': {
            topic: function (FromFile) {
                try {
                    return FromFile(42, function(err, map) {
                        // do nothing
                    });
                } catch (e) {
                    return e;
                }
            },
            'throwing an error otherwise': function (err) {
                assert.instanceOf(err, TypeError);
                assert.equal(err.message, 'Argument 0 must be a string');
            }
        },
        'requires a function for the second argument': {
            topic: function (FromFile) {
                try {
                    return FromFile('first-arg', 'second-arg');
                } catch (e) {
                    return e;
                }
            },
            'throwing an error otherwise': function (err) {
                assert.instanceOf(err, TypeError);
                assert.equal(err.message, 'Argument 1 must be a function');
            }
        }
    }
}).addBatch({
    // Ensure `FromString` has the expected interface

    '`Map.FromString`': {
        topic: function () {
            return mapserv.Map.FromString;
        },

        'works with two valid arguments': {
            topic: function (FromString) {
                return typeof(FromString('map string', function(err, map) {
                    // do nothing
                }));
            },
            'returning undefined': function (retval) {
                assert.equal(retval, 'undefined');
            }
        },
        'fails with one argument': {
            topic: function (FromString) {
                try {
                    return FromString('first-arg');
                } catch (e) {
                    return e;
                }
            },
            'by throwing an error': function (err) {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'usage: Map.FromString(mapfile, callback)');
            }
        },
        'fails with three arguments': {
            topic: function (FromString) {
                try {
                    return FromString('first-arg', 'second-arg', 'third-arg');
                } catch (e) {
                    return e;
                }
            },
            'by throwing an error': function (err) {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'usage: Map.FromString(mapfile, callback)');
            }
        },
        'fails without a string or buffer for the first argument': {
            topic: function (FromString) {
                try {
                    return FromString(42, function(err, map) {
                        // do nothing
                    });
                } catch (e) {
                    return e;
                }
            },
            'throwing an error otherwise': function (err) {
                assert.instanceOf(err, TypeError);
                assert.equal(err.message, 'Argument 0 must be a string or buffer');
            }
        },
        'fails with an object that is not a buffer as the first argument': {
            topic: function (FromString) {
                try {
                    return FromString(['not a buffer'], function(err, map) {
                        // do nothing
                    });
                } catch (e) {
                    return e;
                }
            },
            'throwing an error otherwise': function (err) {
                assert.instanceOf(err, TypeError);
                assert.equal(err.message, 'Argument 0 must be a string or buffer');
            }
        },
        'requires a function for the second argument': {
            topic: function (FromString) {
                try {
                    return FromString('first-arg', 'second-arg');
                } catch (e) {
                    return e;
                }
            },
            'throwing an error otherwise': function (err) {
                assert.instanceOf(err, TypeError);
                assert.equal(err.message, 'Argument 1 must be a function');
            }
        }
    }
}).addBatch({
    // Ensure errors provide the expected interface

    'Loading a non-existent mapfile': {
        topic: function () {
            mapserv.Map.FromFile('non-existent-file', this.callback); // this should produce two errors
        },

        'results in an error': function (err, result) {
            assert.equal(undefined, result);
            assertMapserverError('MS_DEFAULT_MAPFILE_PATTERN validation failed.', err);
            assert.lengthOf(err.errorStack, 1);
            assertMapserverError('String failed expression test.', err.errorStack[0], true);
        }
    }
}).addBatch({
    // Ensure `Map.FromFile` works as expected

    'A valid mapfile file': {
        topic: path.join(__dirname, 'valid.map'),

        'when loaded with a valid callback': {
            topic: function (mapfile) {
                mapserv.Map.FromFile(mapfile, this.callback); // load the map from file
            },
            'results in a `Map`': function (err, result) {
                assert.isNull(err);
                assert.instanceOf(result, mapserv.Map);
            }
        }
    },
    'An invalid mapfile': {
        topic: path.join(__dirname, 'invalid.map'),

        'when loaded': {
            topic: function (mapfile) {
                mapserv.Map.FromFile(mapfile, this.callback); // load the map from file
            },
            'results in an error': function (err, result) {
                assert.equal(undefined, result);
                assertMapserverError('Parsing error near (LAYER):(line 14)', err);                
            }
        }
    }
}).addBatch({
    // Ensure `Map.FromString` works as expected

    'A valid mapfile string': {
        topic: function () {
            var mapfile = path.join(__dirname, 'valid.map');
            fs.readFile(mapfile, "utf8", this.callback);
        },
        'when loaded with a valid callback': {
            topic: function (mapfile) {
                mapserv.Map.FromString(mapfile, this.callback); // load the map from a file
            },
            'results in a `Map`': function (err, result) {
                assert.isNull(err);
                assert.instanceOf(result, mapserv.Map);
            }
        }
    },
    'A valid mapfile buffer': {
        topic: function () {
            var mapfile = path.join(__dirname, 'valid.map');
            fs.readFile(mapfile, this.callback);
        },
        'when loaded with a valid callback': {
            topic: function (mapfile) {
                mapserv.Map.FromString(mapfile, this.callback); // load the map from a file
            },
            'results in a `Map`': function (err, result) {
                assert.isNull(err);
                assert.instanceOf(result, mapserv.Map);
            }
        }
    },
    'An invalid mapfile buffer': {
        topic: function () {
            var mapfile = path.join(__dirname, 'invalid.map');
            fs.readFile(mapfile, this.callback);
        },
        'when loaded': {
            topic: function (mapfile) {
                mapserv.Map.FromString(mapfile, this.callback); // load the map from a string
            },
            'results in an error': function (err, result) {
                assert.equal(undefined, result);
                assertMapserverError('Parsing error near (LAYER):(line 14)', err); 
            }
        }
    },
    'A mapfile buffer with a comment': {
        topic: "MAP \
    NAME DEMO \
    STATUS ON \
    SIZE 150 150 \
    EXTENT 0 0 150 150 \
    IMAGECOLOR 255 255 255 \
    IMAGETYPE png \
    LAYER \
        NAME foo \
        TYPE POINT \
        STATUS DEFAULT \
        TRANSFORM False \
        FEATURE \
            POINTS \
                50 50 \
            END \
        END \
        CLASS \
            LABEL \
                SIZE 10 \
                COLOR 0 0 0 \
                TYPE BITMAP \
                TEXT \"hello\" # doesn't work\
            END \
        END \
    END \
END",
        'when loaded': {
            topic: function (mapfile) {
                mapserv.Map.FromString(mapfile, this.callback); // load the map from a string
            },
            'results in an error': function (err, result) {
                assert.equal(undefined, result);
                assertMapserverError('Could not load mapfile', err); 
            }
        }
    }
}).addBatch({
    // Ensure `Map.mapserv` has the expected interface

    'the `Map.mapserv` method': {
        topic: function () {
            mapserv.Map.FromFile(path.join(__dirname, 'valid.map'), this.callback);
        },

        'works with two valid arguments': {
            topic: function (map) {
                return typeof(map.mapserv({}, function(err, response) {
                    // do nothing
                }));
            },
            'returning undefined when called': function (retval) {
                assert.equal(retval, 'undefined');
            }
        },
        'works with body data as a string': {
            topic: function (map) {
                return typeof(map.mapserv({}, "mode=map&layer=credits", function(err, response) {
                    // do nothing
                }));
            },
            'returning undefined when called': function (retval) {
                assert.equal(retval, 'undefined');
            }
        },
        'works with body data as a buffer': {
            topic: function (map) {
                return typeof(map.mapserv({}, new Buffer("mode=map&layer=credits"), function(err, response) {
                    // do nothing
                }));
            },
            'returning undefined when called': function (retval) {
                assert.equal(retval, 'undefined');
            }
        },
        'works with body data as `null`': {
            topic: function (map) {
                return typeof(map.mapserv({}, null, function(err, response) {
                    // do nothing
                }));
            },
            'returning undefined when called': function (retval) {
                assert.equal(retval, 'undefined');
            }
        },
        'works with body data as `undefined`': {
            topic: function (map) {
                return typeof(map.mapserv({}, undefined, function(err, response) {
                    // do nothing
                }));
            },
            'returning undefined when called': function (retval) {
                assert.equal(retval, 'undefined');
            }
        },
        'fails with body data as an object': {
            topic: function (map) {
                try {
                    return map.mapserv({}, {}, function(err, response) {
                        // do nothing
                    });
                } catch (e) {
                    return e;
                }
            },
            'throwing an error': function (err) {
                assert.instanceOf(err, Error);
                assert.equal(err.message, "Argument 1 must be one of a string; buffer; null; undefined");
            }
        },
        'fails with one argument': {
            topic: function (map) {
                try {
                    return map.mapserv('first-arg');
                } catch (e) {
                    return e;
                }
            },
            'throwing an error': function (err) {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'usage: Map.mapserv(env, [body], callback)');
            }
        },
        'fails with four arguments': {
            topic: function (map) {
                try {
                    return map.mapserv('1st', '2nd', '3rd', '4th');
                } catch (e) {
                    return e;
                }
            },
            'throwing an error': function (err) {
                assert.instanceOf(err, Error);
                assert.equal(err.message, 'usage: Map.mapserv(env, [body], callback)');
            }
        },
        'requires an object for the first argument': {
            topic: function (map) {
                try {
                    return map.mapserv(null, function(err, response) {
                        // do nothing
                    });
                } catch (e) {
                    return e;
                }
            },
            'throwing an error otherwise': function (err) {
                assert.instanceOf(err, TypeError);
                assert.equal(err.message, 'Argument 0 must be an object');
            }
        },
        'requires a function for the second argument': {
            topic: function (map) {
                try {
                    return map.mapserv({}, null);
                } catch (e) {
                    return e;
                }
            },
            'throwing an error otherwise': function (err) {
                assert.instanceOf(err, TypeError);
                assert.equal(err.message, 'Argument 1 must be a function');
            }
        }
    }
}).addBatch({
    // Ensure mapserv functions as expected with a valid map
    'requesting a valid map': {
        topic: function () {
            mapserv.Map.FromFile(path.join(__dirname, 'valid.map'), this.callback);
        },
        'via `GET`': {
            topic: function (map) {
                return map.mapserv(
                    {
                        'REQUEST_METHOD': 'GET',
                        // all GET variables after `layer` are there to ensure
                        // code in `node-mapservutil.c` is covered
                        'QUERY_STRING': 'mode=map&layer=credits&classgroup=group2&map.name=new_name&context=/foo/bar.xml&context=http://foo/bar.xml',
                        'HTTP_COOKIE': 'Cookie=tasty' // ensure code in `node-mapservutil.c` is covered
                    },
                    this.callback);
            },
            'returns a response': {
                'which is an object': function (response) {
                    assert.instanceOf(response, Object);
                },
                'which has the correct headers': function (response) {
                    assert.lengthOf(response.headers, 2);

                    // check the content-type
                    assert.isArray(response.headers['Content-Type']);
                    assert.deepEqual(response.headers['Content-Type'],  [ 'image/png' ]);

                    // check the content-length
                    assert.isArray(response.headers['Content-Length']);
                    assert.lengthOf(response.headers['Content-Length'], 1);
                    assert.isNumber(response.headers['Content-Length'][0]);
                    assert.isTrue(response.headers['Content-Length'][0] > 0);
                },
                'which returns image data as a `Buffer`': function (response) {
                    assert.isObject(response.data);
                    assert.instanceOf(response.data, buffer.Buffer);
                    assert.isTrue(response.data.length > 0);
                }
            },
            'does not return an error': function (err, response) {
                assert.isNull(err);
            }
        },
        'via `GET` with invalid CGI parameters': {
            topic: function (map) {
                return map.mapserv(
                    {
                        'REQUEST_METHOD': 'GET',
                        'QUERY_STRING': 'mode=map&layer=credits&zoomdir=2' // bad zoomdir
                    }, this.callback);
            },
            'returns an error': function (err, response) {
                assertMapserverError('Zoom direction must be 1, 0 or -1.', err);
            }
        },
        'via `GET` with invalid mapfile parameters': {
            topic: function (map) {
                return map.mapserv(
                    {
                        'REQUEST_METHOD': 'GET',
                        'QUERY_STRING': 'mode=map&layer=credits&map.layer[2].name=oops' // `layer[2]` doesn't exist
                    }, this.callback);
            },
            'returns an error': function (err, response) {
                assertMapserverError('Layer to be modified not valid.', err);
            }
        },
        'via `POST`': {
            'using a string': {
                topic: function (map) {
                    var body = 'mode=map&layer=credits';
                    return map.mapserv(
                        {
                            'REQUEST_METHOD': 'POST',
                            'CONTENT_TYPE': 'application/x-www-form-urlencoded',
                            'CONTENT_LENGTH': body.length
                        },
                        body,
                        this.callback);
                },
                'returns a response': {
                    'which is an object': function (response) {
                        assert.instanceOf(response, Object);
                    },
                    'which has the correct headers': function (response) {
                        assert.lengthOf(response.headers, 2);

                        // check the content-type
                        assert.isArray(response.headers['Content-Type']);
                        assert.deepEqual(response.headers['Content-Type'],  [ 'image/png' ]);

                        // check the content-length
                        assert.isArray(response.headers['Content-Length']);
                        assert.lengthOf(response.headers['Content-Length'], 1);
                        assert.isNumber(response.headers['Content-Length'][0]);
                        assert.isTrue(response.headers['Content-Length'][0] > 0);
                    },
                    'which returns image data as a `Buffer`': function (response) {
                        assert.isObject(response.data);
                        assert.instanceOf(response.data, buffer.Buffer);
                        assert.isTrue(response.data.length > 0);
                    }
                },
                'does not return an error': function (err, response) {
                    assert.isNull(err);
                }
            },
            'using a buffer': {
                topic: function (map) {
                    var body = new Buffer('mode=map&layer=credits');
                    return map.mapserv(
                        {
                            'REQUEST_METHOD': 'POST',
                            'CONTENT_TYPE': 'application/x-www-form-urlencoded',
                            'CONTENT_LENGTH': body.length
                        },
                        body,
                        this.callback);
                },
                'returns a response': {
                    'which is an object': function (response) {
                        assert.instanceOf(response, Object);
                    },
                    'which has the correct headers': function (response) {
                        assert.lengthOf(response.headers, 2);

                        // check the content-type
                        assert.isArray(response.headers['Content-Type']);
                        assert.deepEqual(response.headers['Content-Type'],  [ 'image/png' ]);

                        // check the content-length
                        assert.isArray(response.headers['Content-Length']);
                        assert.lengthOf(response.headers['Content-Length'], 1);
                        assert.isNumber(response.headers['Content-Length'][0]);
                        assert.isTrue(response.headers['Content-Length'][0] > 0);
                    },
                    'which returns image data as a `Buffer`': function (response) {
                        assert.isObject(response.data);
                        assert.instanceOf(response.data, buffer.Buffer);
                        assert.isTrue(response.data.length > 0);
                    }
                },
                'does not return an error': function (err, response) {
                    assert.isNull(err);
                }
            }
        },
        'with no `REQUEST_METHOD` returns a response': {
            topic: function (map) {
                map.mapserv(
                    {
                        // empty
                    },
                    this.callback);
            },
            'which is an object': function (err, response) {
                assert.instanceOf(response, Object);
            },
            'which only has a `Content-Length` header': function (err, response) {
                assert.lengthOf(response.headers, 1);
                assert.isArray(response.headers['Content-Length']);
                assert.lengthOf(response.headers['Content-Length'], 1);
                assert.isNumber(response.headers['Content-Length'][0]);
                assert.isTrue(response.headers['Content-Length'][0] > 0);
            },
            'which has text data as a `Buffer`': function (err, response) {
                assert.isObject(response.data);
                assert.instanceOf(response.data, buffer.Buffer);
                assert.isTrue(response.data.length > 0);
            },
            'which has an error': function (err, response) {
                assertMapserverError('No request parameters loaded', err);
            }
        },
        'with a `REQUEST_METHOD` but no `QUERY_STRING` returns a response': {
            topic: function (map) {
                return map.mapserv(
                    {
                        'REQUEST_METHOD': 'GET'
                        // no QUERY_STRING
                    },
                    this.callback);
            },
            'which is an object': function (err, response) {
                assert.instanceOf(response, Object);
            },
            'which has the correct headers': function (err, response) {
                assert.lengthOf(response.headers, 2);

                // check the content-type
                assert.isArray(response.headers['Content-Type']);
                assert.deepEqual(response.headers['Content-Type'],  [ 'text/html' ]);

                // check the content-length
                assert.isArray(response.headers['Content-Length']);
                assert.lengthOf(response.headers['Content-Length'], 1);
                assert.isNumber(response.headers['Content-Length'][0]);
                assert.isTrue(response.headers['Content-Length'][0] > 0);
            },
            'which has text data as a `Buffer`': function (err, response) {
                assert.isObject(response.data);
                assert.instanceOf(response.data, buffer.Buffer);
                assert.isTrue(response.data.length > 0);
                assert.equal(response.data.toString(), "No query information to decode. QUERY_STRING not set.\n");
            },
            'returns an error': function (err, response) {
                assertMapserverError('No request parameters loaded', err);
            }
        }
    }
}).addBatch({
    // Ensure `createCGIEnvironment` works as expected
    'calling `createCGIEnvironment`': {
        topic: mapserv.createCGIEnvironment(dummyRequest(), {
            SCRIPT_NAME: '/testing' // overwrite a variable
        }),

        'should produce the expected CGI environment': function (env) {
            assert.isObject(env);
            assert.deepEqual(env, {
                SERVER_SOFTWARE: 'Node.js',
                SERVER_NAME: 'localhost',
                GATEWAY_INTERFACE: 'CGI/1.1',
                SERVER_PROTOCOL: 'HTTP/1.1',
                SERVER_PORT: '80',
                REQUEST_METHOD: 'POST',
                PATH_INFO: '/foo/bar',
                PATH_TRANSLATED: path.resolve(path.join('.', 'foo/bar')),
                SCRIPT_NAME: '/testing',
                QUERY_STRING: 'key=value',
                REMOTE_ADDR: '127.0.0.0',
                CONTENT_LENGTH: '22',
                CONTENT_TYPE: 'application/x-www-form-urlencoded',
                AUTH_TYPE: 'Basic',
                HTTP_ACCEPT: '*/*' });
        }
    }
}).export(module); // Export the Suite
