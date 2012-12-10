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

#ifndef NODE_MAPSERVUTIL_H
#define NODE_MAPSERVUTIL_H

/**
 * @file node-mapservutil.h
 * @brief This declares C utility functions used by the `Map` class.
 *
 * This is C code which encapsulates mapserver code that is not exposed by
 * libmapserver and must therefore be duplicated.  It also includes code which
 * is made available in libmapserver but which is not accessible to C++
 * (i.e. the rest of the module) for linkage reasons; wrapping the code here
 * enables it to be used elsewhere by C++.
 */

#include "mapserver.h"
#include "mapthread.h"

#ifdef __cplusplus
extern "C" {
#endif

/* `mapserv.h` is not wrapped with `extern "C"` */
#include "mapserv.h"

/**
 * Wrap the mapserver `loadParams` function
 *
 * This is necessary because `loadParams` is not wrapped in an `extern "C"`
 * which causes linker problems when compiling with C++ due to name mangling.
 */
int wrap_loadParams(cgiRequestObj *request, char* (*getenv2)(const char*, void* thread_context),
                   char *raw_post_data, ms_uint32 raw_post_data_length, void* thread_context);

/**
 * Perform mapserv request map initialisation (e.g. variable substitutions)
 *
 * This function is copied verbatim from the latter part of `msCGILoadMap()`
 * with the exception of adding the mutex around `msUpdateMapFromURL()` and
 * altering the return type.
 */
int updateMap(mapservObj *mapserv, mapObj *map);

#ifdef __cplusplus
}
#endif

#endif /* NODE_MAPSERVUTIL_H */
