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

#include "map.hpp"
#include "node-mapservutil.h"

Persistent<FunctionTemplate> Map::map_template;

Persistent<String> Map::data_symbol;
Persistent<String> Map::headers_symbol;

void Map::Init(Handle<Object> target) {
  HandleScope scope;

  Local<FunctionTemplate> template_ = FunctionTemplate::New(New);

  map_template = Persistent<FunctionTemplate>::New(template_);
  map_template->InstanceTemplate()->SetInternalFieldCount(1);
  map_template->SetClassName(String::NewSymbol("Map"));

  data_symbol = NODE_PSYMBOL("data");
  headers_symbol = NODE_PSYMBOL("headers");

  NODE_SET_PROTOTYPE_METHOD(map_template, "mapserv", MapservAsync);
  NODE_SET_METHOD(map_template, "FromFile", FromFileAsync);
  NODE_SET_METHOD(map_template, "FromString", FromStringAsync);

  target->Set(String::NewSymbol("Map"), map_template->GetFunction());
}

Handle<Value> Map::New(const Arguments& args) {
  HandleScope scope;
  if (!args.IsConstructCall()) {
    THROW_CSTR_ERROR(Error, "Map() is expected to be called as a constructor with the `new` keyword");
  }

  if (args.Length() != 1) {
    THROW_CSTR_ERROR(Error, "usage: new Map(mapObj)");
  }
  REQ_EXT_ARG(0, map);

  Map* self = new Map((mapObj *)map->Value());
  self->Wrap(args.This());
  return scope.Close(args.This());
}

Handle<Value> Map::FromFileAsync(const Arguments& args) {
  HandleScope scope;

  if (args.Length() != 2) {
    THROW_CSTR_ERROR(Error, "usage: Map.FromFile(mapfile, callback)");
  }
  REQ_STR_ARG(0, mapfile);
  REQ_FUN_ARG(1, callback);

  Baton *baton = new Baton();

  baton->request.data = baton;
  baton->map = NULL;
  baton->callback = Persistent<Function>::New(callback);
  baton->mapfile = *mapfile;

  uv_queue_work(uv_default_loop(), &baton->request, FromFileWork, FromFileAfter);
  return Undefined();
}

void Map::FromFileWork(uv_work_t *req) {
  /* No HandleScope! This is run in a separate thread: *No* contact
     should be made with the Node/V8 world here. */

  Baton *baton = static_cast<Baton*>(req->data);
  
  baton->map = msLoadMap(const_cast<char *>(baton->mapfile.c_str()), NULL);
  if (!baton->map) {
    errorObj *error = msGetErrorObj();
    if (!error || error->code == MS_NOERR || error->isreported) {
      baton->error = "Could not load mapfile";
    } else {
      baton->error = error->message;
    }
  }

  msResetErrorList();
  return;
}

void Map::FromFileAfter(uv_work_t *req) {
  HandleScope scope;

  Baton *baton = static_cast<Baton*>(req->data);
  Handle<Value> argv[2];

  if (!baton->error.empty()) {
    argv[0] = Exception::Error(String::New(baton->error.c_str()));
    argv[1] = Undefined();
  } else {
    Local<Value> mapObj = External::New(baton->map);
    Persistent<Object> map = Persistent<Object>(map_template->GetFunction()->NewInstance(1, &mapObj));

    argv[0] = Undefined();
    argv[1] = scope.Close(map);
  }

  // pass the results to the user specified callback function
  TryCatch try_catch;
  baton->callback->Call(Context::GetCurrent()->Global(), 2, argv);
  if (try_catch.HasCaught()) {
    FatalException(try_catch);
  }

  // clean up
  baton->callback.Dispose();
  delete baton;
  return;
}

Handle<Value> Map::FromStringAsync(const Arguments& args) {
  HandleScope scope;
  string mapfile;

  if (args.Length() != 2) {
    THROW_CSTR_ERROR(Error, "usage: Map.FromString(mapfile, callback)");
  }

  // get the mapfile string from the arguments
  if (args[0]->IsString()) {
    mapfile = *String::Utf8Value(args[0]->ToString());
  } else if (args[0]->IsObject()) {
    // see if it's a buffer
    if (!Buffer::HasInstance(args[0])) {
      THROW_CSTR_ERROR(TypeError, "Argument 0 must be a string or buffer");
    }
    Local<Object> buffer = args[0]->ToObject();
    mapfile = string(Buffer::Data(buffer), Buffer::Length(buffer));
  } else {
    THROW_CSTR_ERROR(TypeError, "Argument 0 must be a string or buffer");
  }

  REQ_FUN_ARG(1, callback);

  Baton *baton = new Baton();
  baton->request.data = baton;
  baton->map = NULL;
  baton->callback = Persistent<Function>::New(callback);
  baton->mapfile = mapfile;

  // Run in a different thread. Note there is *no* `FromStringAfter`:
  // `FromFileAfter` is used instead.
  uv_queue_work(uv_default_loop(), &baton->request, FromStringWork, FromFileAfter);
  return Undefined();
}

void Map::FromStringWork(uv_work_t *req) {
  /* No HandleScope! This is run in a separate thread: *No* contact
     should be made with the Node/V8 world here. */

  Baton *baton = static_cast<Baton*>(req->data);

  baton->map = msLoadMapFromString(const_cast<char *>(baton->mapfile.c_str()), NULL);
  if (!baton->map) {
    errorObj *error = msGetErrorObj();
    if (!error || error->code == MS_NOERR || error->isreported) {
      baton->error = "Could not load mapfile";
    } else {
      baton->error = error->message;
    }
  }

  msResetErrorList();
  return;
}

Handle<Value> Map::MapservAsync(const Arguments& args) {
  HandleScope scope;

  if (args.Length() != 2) {
    THROW_CSTR_ERROR(Error, "usage: Map.mapserv(env, callback)");
  }
  REQ_OBJ_ARG(0, env);
  REQ_FUN_ARG(1, callback);

  Map* self = ObjectWrap::Unwrap<Map>(args.This());
  MapBaton *baton = new MapBaton();

  baton->request.data = baton;
  baton->self = self;
  baton->callback = Persistent<Function>::New(callback);
  baton->map = self->map;

  // Convert the environment object to a map
  const Local<Array> properties = env->GetPropertyNames();
  const uint32_t length = properties->Length();
  for (uint32_t i = 0; i < length; ++i) {
    const Local<Value> key = properties->Get(i);
    const Local<Value> value = env->Get(key);
    baton->env.insert(pair<string, string>(string(*String::Utf8Value(key->ToString())),
                                           string(*String::Utf8Value(value->ToString())))
                      );
  }

  self->Ref(); // increment reference count so map is not garbage collected

  uv_queue_work(uv_default_loop(), &baton->request, MapservWork, MapservAfter);
  return Undefined();
}

void Map::MapservWork(uv_work_t *req) {
  /* No HandleScope! This is run in a separate thread: *No* contact
     should be made with the Node/V8 world here. */

  MapBaton *baton = static_cast<MapBaton*>(req->data);
  mapservObj* mapserv = msAllocMapServObj();
  bool reportError = false;     // flag an error as worthy of reporting

  msIO_installStdoutToBuffer(); // ensure stdout is buffered

  // load the CGI parameters from the environment object
  mapserv->request->NumParams = wrap_loadParams(mapserv->request, GetEnv, NULL, 0, static_cast<void *>(&(baton->env)));
  if( mapserv->request->NumParams == -1 ) {
    // no errors are generated but messages are output instead
    reportError = true;
    goto get_output;
  }

  // Copy the map into the mapservObj for this request
  if(!LoadMap(mapserv, baton->map)) {
    reportError = true;
    goto get_output;
  }

  // Execute the request
  if(msCGIDispatchRequest(mapserv) != MS_SUCCESS) {
    reportError = true;
    goto get_output;
  }

 get_output:
  // Get the content type. If headers other than content-type need to be
  // retrieved it may be best to use something along the lines of
  // <https://github.com/joyent/http-parser>.
  baton->content_type = msIO_stripStdoutBufferContentType();
  msIO_stripStdoutBufferContentHeaders();
  
  // Get the buffered output
  baton->buffer = msIO_getStdoutBufferBytes();

  // handle any unhandled errors
  errorObj *error = msGetErrorObj();
  if (error && error->code != MS_NOERR) {
    // report either specific errors or unhandled errors
    if (reportError or !error->isreported) {
      baton->error = error->message;
    }
    msResetErrorList();         // clear all handled errors
  }

  // clean up
  msFreeMapServObj(mapserv);
  return;
}

void Map::MapservAfter(uv_work_t *req) {
  HandleScope scope;

  MapBaton *baton = static_cast<MapBaton*>(req->data);
  Map *self = baton->self;
  gdBuffer *buffer = baton->buffer;

  Handle<Value> argv[2];

  if (!baton->error.empty()) {
    argv[0] = Exception::Error(String::New(baton->error.c_str()));
  } else {
    argv[0] = Undefined();
  }

  // convert the http_response to a javascript object
  Local<Object> result = Object::New();

  // Add the content-type to the headers object.  This object mirrors the
  // HTTP headers structure and creates an API that allows for the addition
  // of other headers in the future.
  Local<Object> headers = Object::New();
  if (baton->content_type) {
    Local<Array> values = Array::New(1);

    values->Set(0, String::New(baton->content_type));
    headers->Set(String::New("Content-Type"), values);
  }
  result->Set(headers_symbol, headers);

  // set the response data as a Node Buffer object
  if (buffer && buffer->data) {
    result->Set(data_symbol, Buffer::New((char *)buffer->data, buffer->size)->handle_);

    // add the content-length header
    Local<Array> values = Array::New(1);
    values->Set(0, Uint32::New(buffer->size));
    headers->Set(String::New("Content-Length"), values);
  }

  argv[1] = result;

  // pass the results to the user specified callback function
  TryCatch try_catch;
  baton->callback->Call(Context::GetCurrent()->Global(), 2, argv);
  if (try_catch.HasCaught()) {
    FatalException(try_catch);
  }

  // clean up
  if (buffer) {
    if (buffer->data && buffer->owns_data) {
      msFree(buffer->data);
    }
    delete baton->buffer;
    baton->buffer = NULL;
  }

  if (baton->content_type) {
    msFree(baton->content_type);
  }

  baton->env.clear();
  baton->callback.Dispose();
  self->Unref(); // decrement the cache reference so it can be garbage collected
  delete baton;
  return;
}

char* Map::GetEnv(const char *name, void* thread_context) {
  std::map<string, string> *env = static_cast<std::map<string, string> *>(thread_context);
  std::map<string, string>::iterator it = env->find(std::string(name));

  if (it != env->end()) {
    return const_cast<char *>(it->second.c_str());
  } else {
    return NULL;
  }
}

Map::gdBuffer* Map::msIO_getStdoutBufferBytes(void) {
  msIOContext *ctx = msIO_getHandler( (FILE *) "stdout" );
  msIOBuffer  *buf;
  gdBuffer *gdBuf;

  if( ctx == NULL || ctx->write_channel == MS_FALSE 
      || strcmp(ctx->label,"buffer") != 0 )
    {
      msSetError( MS_MISCERR, "Can't identify msIO buffer.",
                  "msIO_getStdoutBufferBytes" );
      return NULL;
    }

  buf = (msIOBuffer *) ctx->cbData;

  gdBuf = new gdBuffer();
  gdBuf->data = buf->data;
  gdBuf->size = buf->data_offset;
  gdBuf->owns_data = MS_TRUE;

  /* we are seizing ownership of the buffer contents */
  buf->data_offset = 0;
  buf->data_len = 0;
  buf->data = NULL;

  return gdBuf;
}

mapObj* Map::LoadMap(mapservObj *mapserv, mapObj *src) {
  mapObj* map = msNewMapObj();

  if (!map) {
    return NULL;
  }

  // updating alters the state of the map, so work on a copy
  if (msCopyMap(map, src) != MS_SUCCESS) {
    msFreeMap(map);
    return NULL;
  }
  mapserv->map = map;

  // delegate to the helper function
  if (updateMap(mapserv, map) != MS_SUCCESS) {
    msFreeMap(map);
    mapserv->map = NULL;
    return NULL;
  }

  return map;
}
