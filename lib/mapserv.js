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
 * Mapserv module
 *
 * This acts as a JavaScript shim exposing the API defined in the C++ addon.
 *
 * See the README for further details on the module.
 */

var bindings = require('../build/Release/bindings'),
    path = require('path'),     // for file path manipulations
    url = require('url');       // for url parsing

/**
 * Create a CGI environment from a Node HTTP request object
 *
 * This is a utility function that facilitates the generation of CGI
 * environment variables from a Node HTTP request object.
 *
 * See
 * <http://en.wikipedia.org/wiki/Common_Gateway_Interface#Environment_variables>
 * for details of CGI environment variables.
 */
function createCGIEnvironment(req, vars) {
    var urlParts = url.parse(decodeURIComponent(req.url)), // parse the request url
        host = req.headers.host.split(':'),
        env = {
            // Server specific variables:
            SERVER_SOFTWARE: 'Node.js',
            SERVER_NAME: host[0],
            GATEWAY_INTERFACE: 'CGI/1.1',

            // Request specific variables:
            SERVER_PROTOCOL: 'HTTP/' + req.httpVersion,
            SERVER_PORT: host[1],
            REQUEST_METHOD: req.method,
            PATH_INFO: urlParts.pathname || '/',
            PATH_TRANSLATED: path.resolve(path.join('.', urlParts.pathname)),
            SCRIPT_NAME: '/',
            QUERY_STRING: urlParts.query || '',
            REMOTE_ADDR: req.connection.remoteAddress
        },
        key;

    // add content and authorisation specific variables
    if ('content-length' in req.headers) {
        env.CONTENT_LENGTH = req.headers['content-length'];
    }
    if ('content-type' in req.headers) {
        env.CONTENT_TYPE = req.headers['content-type'];
    }
    if ('authorization' in req.headers) {
        var auth = req.headers.authorization.split(' ');
        env.AUTH_TYPE = auth[0];
    }

    // add client specific variables
    for (key in req.headers) {
        switch (key) {
        case 'host':
        case 'content-length':
        case 'content-type':
        case 'authorization':
            // skip already handled headers
            break;
        default:
            // convert the header to a CGI variable
            var name = 'HTTP_' + key.toUpperCase().replace(/-/g, '_');
            env[name] = req.headers[key];
        }
    }

    // add user specified variables
    if (vars) {
        for (key in vars) {
            env[key] = vars[key];
        }
    }

    return env;
}

module.exports.Map = bindings.Map;
module.exports.versions = bindings.versions;
module.exports.createCGIEnvironment = createCGIEnvironment;
