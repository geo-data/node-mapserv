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
 * @file node-mapserv.cpp
 * @brief This registers and initialises the module with Node.
 *
 * @mainpage Node %Mapserv
 *
 * This represents the C++ bindings that are part of a module
 * providing access from <a href="http://nodejs.org">Node.js</a> to
 * the functionality provided by the <a
 * href="http://www.mapserver.org">Mapserver mapserv CGI</a> program.
 *
 * Map is the primary C++ class which wraps the underlying MapServer
 * `mapObj` data structure.  A javascript shim is used in the package
 * to expose this class to javascript clients.
 *
 * See the `README.md` file distributed with the package for further
 * details.
 */

#include <signal.h>
#include "map.hpp"
#include "error.hpp"

/** Clean up at module exit.
 *
 * This performs housekeeping duties when the module is
 * unloaded.
 *
 * The function signature is designed so that a pointer to the
 * function can be passed to the `atexit` function.
 */
static void cleanup(void) {
  msCleanup(0);
}

/** Initialise the module.
 *
 * This is the entry point to the module called by Node and as such it
 * performs various initialisation functions:
 *
 * - Sets up the `libmapserver` library
 * - Initialises the `Map` class
 * - Ensures `libmapserver` has been compiled with thread support
 *
 * @param target The object representing the module.
 */
extern "C" {
  static void init (Handle<Object> target) {

    // initialise mapserver
    if (msSetup() != MS_SUCCESS ) {
      errorObj *error = msGetErrorObj();

      if(!error || error->code == MS_NOERR || error->isreported) {
        // either we have no error, or it was already reported by other means
        ThrowException(Exception::Error(String::New("Mapserver setup failed")));
      } else {
        ThrowException(Exception::Error(String::New(error->message)));
      }
      msResetErrorList();
      msCleanup(0);
      return;
    }

    // a runtime check to ensure we have a mapserver that supports threads
    if (!strstr(msGetVersion(), "SUPPORTS=THREADS")) {
      ThrowException(Exception::Error(String::New("Mapserver is not compiled with support for threads")));
      msCleanup(0);
      return;
    }

    // initialise module components
    Map::Init(target);
    MapserverError::Init();

    // versioning information
    Local<Object> versions = Object::New();
    versions->Set(String::NewSymbol("node_mapserv"), String::New(NODE_MAPSERV_VERSION));
    versions->Set(String::NewSymbol("mapserver"), String::New(MS_VERSION));
#ifdef MS_VERSION_NUM
    versions->Set(String::NewSymbol("mapserver_numeric"), Integer::New(msGetVersionInt()));
#endif
    versions->Set(String::NewSymbol("mapserver_details"), String::New(msGetVersion()));
    target->Set(String::NewSymbol("versions"), versions);

    // Ensure Mapserver is cleaned up on receipt of various signals.
    // Importantly this ensures that `MS_ERRORFILE` is properly closed (if
    // set).
    signal(SIGHUP, msCleanup);
    signal(SIGINT, msCleanup);
#ifdef SIGQUIT
    signal(SIGQUIT, msCleanup);
#endif
    signal(SIGTERM, msCleanup);
#ifdef SIGUSR1
    signal(SIGUSR1, msCleanup);
#endif
#ifdef SIGUSR2
    signal(SIGUSR2, msCleanup);
#endif
    atexit(cleanup);            // clean up on normal exit
  }
}

/// Register the module
NODE_MODULE(bindings, init)
