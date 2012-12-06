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

#ifndef __NODE_MAPSERV_MAP_H__
#define __NODE_MAPSERV_MAP_H__

// Standard headers
#include <string>
#include <map>

// Node headers
#include <v8.h>
#include <node.h>
#include <node_buffer.h>

// Mapserver headers
#include "mapserver.h"
extern "C" {
#include "mapserv.h"
}

/// Throw an exception generated from a `char` string
#define THROW_CSTR_ERROR(TYPE, STR)                             \
  return ThrowException(Exception::TYPE(String::New(STR)));

/// Assign to a local V8 `Function` variable from the function arguments
#define ASSIGN_FUN_ARG(I, VAR)                              \
  if (args.Length() <= (I) || !args[I]->IsFunction())       \
    THROW_CSTR_ERROR(TypeError,                             \
                     "Argument " #I " must be a function"); \
  VAR = Local<Function>::Cast(args[I]);

/// Create a local V8 `Function` variable from the function arguments
#define REQ_FUN_ARG(I, VAR) \
  Local<Function> VAR;      \
  ASSIGN_FUN_ARG(I, VAR);

/// Create an `UTF8` V8 string variable from the function arguments
#define REQ_STR_ARG(I, VAR)                               \
  if (args.Length() <= (I) || !args[I]->IsString())       \
    THROW_CSTR_ERROR(TypeError,                           \
                     "Argument " #I " must be a string"); \
  String::Utf8Value VAR(args[I]->ToString());

/// Create a local V8 `External` variable from the function arguments
#define REQ_EXT_ARG(I, VAR)                             \
  if (args.Length() <= (I) || !args[I]->IsExternal())   \
    THROW_CSTR_ERROR(TypeError,                         \
                     "Argument " #I " invalid");        \
  Local<External> VAR = Local<External>::Cast(args[I]);

/// Assign to a local V8 `Object` variable from the function arguments
#define ASSIGN_OBJ_ARG(I, VAR)                             \
  if (args.Length() <= (I) || !args[I]->IsObject())        \
    THROW_CSTR_ERROR(TypeError,                            \
                     "Argument " #I " must be an object"); \
  VAR = Local<Object>(args[I]->ToObject());

/// Create a local V8 `Object` variable from the function arguments
#define REQ_OBJ_ARG(I, VAR) \
  Local<Object> VAR;        \
  ASSIGN_OBJ_ARG(I, VAR);

using namespace std;
using namespace node;
using namespace v8;

class Map: ObjectWrap {
public:

  /// Initialise the class
  static void Init(Handle<Object> target);

  /// Instantiate a `Map` instance from a mapfile
  static Handle<Value> FromFileAsync(const Arguments& args);

  /// Instantiate a `Map` instance from a map string
  static Handle<Value> FromStringAsync(const Arguments& args);

  /// Wrap the `mapserv` CGI functionality
  static Handle<Value> MapservAsync(const Arguments& args);

private:

  /// The function template for creating new `Map` instances.
  static Persistent<FunctionTemplate> map_template;

  /// The string "data"
  static Persistent<String> data_symbol;
  /// The string "headers"
  static Persistent<String> headers_symbol;

  /// The underlying mapserver object that the class wraps
  mapObj *map;

  /// The structure used when performing asynchronous operations
  struct Baton {
    /// The asynchronous request
    uv_work_t request;
    /// The mapObj generated by the request
    mapObj *map;
    /// The function executed upon request completion
    Persistent<Function> callback;
    /// The mapfile source from which to create a mapObj
    string mapfile;
    /// A message set when the request fails
    string error;
  };

  struct gdBuffer {
    unsigned char *data;
    int size;
    int owns_data;
  };

  /// Asynchronous context used in method calls
  struct MapBaton: Baton {
    /// The `Map` object from which the call originated
    Map *self;
    /// The Content-Type header
    char *content_type;
    /// The buffer containing the mapserv response
    gdBuffer *buffer;
    /// The CGI environment variables
    std::map<string, string> env;
  };

  /// Intantiate a Map from a mapObj
  Map(mapObj *map) :
    map(map)
  {
    // should throw an error here if !map
  }

  /// Clear up the mapObj
  ~Map() {
    if (map) {
      msFreeMap(map);
    }
  }
  
  /// Instantiate an object
  static Handle<Value> New(const Arguments& args);
  
  /// Create a mapObj a file path
  static void FromFileWork(uv_work_t *req);

  /// Return the new map to the caller
  static void FromFileAfter(uv_work_t *req);

  /// Create a mapObj a string
  static void FromStringWork(uv_work_t *req);

  /// Return the new map to the caller
  static void FromStringAfter(uv_work_t *req);
  
  /// Execute a mapserv request
  static void MapservWork(uv_work_t *req);

  /// Return the mapserv response to the caller
  static void MapservAfter(uv_work_t *req);

  /// Get a CGI environment variable
  static char* GetEnv(const char *name, void* thread_context);

  /// Get the mapserver output as a buffer
  static gdBuffer* msIO_getStdoutBufferBytes(void);

  /// Copy a mapObj into a mapservObj
  static mapObj* LoadMap(mapservObj *mapserv, mapObj *src);
};

#endif  /* __NODE_MAPSERV_MAP_H__ */
