/******************************************************************************
 * Copyright (c) 2013, GeoData Institute (www.geodata.soton.ac.uk)
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

#ifndef __NODE_MAPSERV_ERROR_H__
#define __NODE_MAPSERV_ERROR_H__

/**
 * @file error.hpp
 * @brief This declares error handling facilities.
 */

// Standard headers
#include <string>

// Node related headers
#include <v8.h>
#include <node.h>

// Mapserver headers
#include "maperror.h"

using namespace v8;

/**
 * @brief A representation of a Mapserver error
 *
 * This class effectively duplicates the Mapserver `errorObj` data structure,
 * decorating it with methods that:
 * 
 * - ease instantiation from an `errorObj`
 * - facilitate conversion to a Javascript representation of the error
 *
 * Standard `errorObj` structure cannot be used directly as they are destroyed
 * when their thread terminates.
 */
class MapserverError {
public:

  /// Initialise the class
  static void Init();
  
  /// Instantiate a MapserverError from an errorObj
  MapserverError(const errorObj *error);

  /// Create an error from a string, routine and optional error code
  MapserverError(const char *message, const char *routine, int code=MS_MISCERR) :
    code(code),
    routine(routine),
    message(message),
    isReported(false),
    next(NULL),
    length(1)
  {
  }

  /// Clear up, deleting all linked errors
  ~MapserverError() {
    while (next) {
      MapserverError* prev = next;
      next = prev->next;
      prev->next = NULL;        // so the destructor isn't called recursively
      delete prev;
    }
  }

  /// Convert the error to a V8 exception
  Handle<Value> toV8Error();

private:

  /// The Mapserver error code
  int code;
  /// The routine from which the error originates
  std::string routine;
  /// The error message
  std::string message;
  /// Has the error been reported by Mapserver?
  bool isReported;
  /// The previous error in the error stack
  MapserverError *next;
  /// The number of errors in this error stack
  uint length;

  /// Instantiate a bare bones error: populate it later
  MapserverError() :
    isReported(false),
    next(NULL),
    length(1)
  {
  }

  /// Convert an error to a V8 exception
  static Handle<Value> ToV8Error(MapserverError *error);

  /// The string "MapserverError"
  static Persistent<String> MapserverError_symbol;
  /// The string "name"
  static Persistent<String> name_symbol;
  /// The string "code"
  static Persistent<String> code_symbol;
  /// The string "category"
  static Persistent<String> category_symbol;
  /// The string "routine"
  static Persistent<String> routine_symbol;
  /// The string "isReported"
  static Persistent<String> isReported_symbol;
  /// The string "errorStack"
  static Persistent<String> errorStack_symbol;
};

#endif  /* __NODE_MAPSERV_ERROR_H__ */
