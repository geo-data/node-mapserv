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
 * @file node-mapservutil.c
 * @brief This defines C utility functions used by the `Map` class.
 */

#include "node-mapservutil.h"

/**
 * A utility function copied verbatim from `mapservutil.c`
 */
static void setClassGroup(layerObj *layer, char *classgroup)
{
  int i;

  if(!layer || !classgroup) return;

  for(i=0; i<layer->numclasses; i++) {
    if(layer->class[i]->group && strcmp(layer->class[i]->group, classgroup) == 0) {
      msFree(layer->classgroup);
      layer->classgroup = msStrdup(classgroup);
      return; /* bail */
    }
  }
}

int wrap_loadParams(cgiRequestObj *request, char* (*getenv2)(const char*, void* thread_context),
                   char *raw_post_data, ms_uint32 raw_post_data_length, void* thread_context) {
  return loadParams(request, getenv2, raw_post_data, raw_post_data_length, thread_context);
}

int updateMap(mapservObj *mapserv, mapObj *map) {
  int i, j;

  if(!msLookupHashTable(&(map->web.validation), "immutable")) {
    /* check for any %variable% substitutions here, also do any map_ changes, we do this here so WMS/WFS  */
    /* services can take advantage of these "vendor specific" extensions */
    for(i=0; i<mapserv->request->NumParams; i++) {
      /*
       ** a few CGI variables should be skipped altogether
       **
       ** qstring: there is separate per layer validation for attribute queries and the substitution checks
       **          below conflict with that so we avoid it here
       */
      if(strncasecmp(mapserv->request->ParamNames[i],"qstring",7) == 0) continue;

      /* check to see if there are any additions to the mapfile */
      if(strncasecmp(mapserv->request->ParamNames[i],"map_",4) == 0 || strncasecmp(mapserv->request->ParamNames[i],"map.",4) == 0) {
        msAcquireLock( TLOCK_PARSER );
        if(msUpdateMapFromURL(map, mapserv->request->ParamNames[i], mapserv->request->ParamValues[i]) != MS_SUCCESS) {
          msReleaseLock( TLOCK_PARSER );
          return MS_FAILURE;
        }
        msReleaseLock( TLOCK_PARSER );

        continue;
      }

      if(strncasecmp(mapserv->request->ParamNames[i],"classgroup",10) == 0) { /* #4207 */
        for(j=0; j<map->numlayers; j++) {
          setClassGroup(GET_LAYER(map, j), mapserv->request->ParamValues[i]);
        }
        continue;
      }
    }

    msApplySubstitutions(map, mapserv->request->ParamNames, mapserv->request->ParamValues, mapserv->request->NumParams);
    msApplyDefaultSubstitutions(map);

    /* check to see if a ogc map context is passed as argument. if there */
    /* is one load it */

    for(i=0; i<mapserv->request->NumParams; i++) {
      if(strcasecmp(mapserv->request->ParamNames[i],"context") == 0) {
        if(mapserv->request->ParamValues[i] && strlen(mapserv->request->ParamValues[i]) > 0) {
          if(strncasecmp(mapserv->request->ParamValues[i],"http",4) == 0) {
            if(msGetConfigOption(map, "CGI_CONTEXT_URL"))
              msLoadMapContextURL(map, mapserv->request->ParamValues[i], MS_FALSE);
          } else
            msLoadMapContext(map, mapserv->request->ParamValues[i], MS_FALSE);
        }
      }
    }
  }

  /*
   * RFC-42 HTTP Cookie Forwarding
   * Here we set the http_cookie_data metadata to handle the
   * HTTP Cookie Forwarding. The content of this metadata is the cookie
   * content. In the future, this metadata will probably be replaced
   * by an object that is part of the mapObject that would contain
   * information on the application status (such as cookie).
   */
  if( mapserv->request->httpcookiedata != NULL ) {
    msInsertHashTable( &(map->web.metadata), "http_cookie_data",
                       mapserv->request->httpcookiedata );
  }

  return MS_SUCCESS;
}
