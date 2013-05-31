{
  "targets": [
    {
      "target_name": "bindings",
      "sources": [
        "src/node-mapserv.cpp",
        "src/map.cpp",
        "src/node-mapservutil.c"
      ],
      "include_dirs": [
        "<!@(python tools/config.py --include)"
      ],
      "conditions": [
        ['OS=="linux"', {
          'ldflags': [
            '<!@(python tools/config.py --ldflags)'
          ],
          'libraries': [
            '<!@(mapserver-config --libs)'
          ],
          'cflags': [
            '<!@(mapserver-config --cflags)',
            '-pedantic',
            '-Wall'
          ],
        }],
        ['OS=="win"', {
            "variables": {
                'ms_buildkit%': 'Z:/PATH/TO/MAPSERVER_BUILDKIT',
                'ms_root%': 'Z:/PATH/TO/MAPSERVER'
            },
            "include_dirs" : [ 
                "<(ms_root)/",
                "<(ms_buildkit)/include/" 
            ],
            "libraries" : [
                '<(ms_root)/mapserver_i.lib',
                '<(ms_buildkit)/lib/gdal_i.lib',
                '<(ms_buildkit)/lib/agg.lib',
                '<(ms_buildkit)/lib/cairo.lib',
                '<(ms_buildkit)/lib/cfitsio.lib',
                '<(ms_buildkit)/lib/fontconfig.lib',
                '<(ms_buildkit)/lib/freetype239.lib',
                '<(ms_buildkit)/lib/freexl.lib',
                '<(ms_buildkit)/lib/freexl_i.lib',
                '<(ms_buildkit)/lib/fribidi.lib',
                '<(ms_buildkit)/lib/ftgl.lib',
                '<(ms_buildkit)/lib/gd.lib',
                '<(ms_buildkit)/lib/gdal_i.lib',
                '<(ms_buildkit)/lib/geos_c_i.lib',
                '<(ms_buildkit)/lib/giflib.lib',
                '<(ms_buildkit)/lib/hdf5dll.lib',
                '<(ms_buildkit)/lib/iconv.lib',
                '<(ms_buildkit)/lib/libcurl_imp.lib',
                '<(ms_buildkit)/lib/libeay32.lib',
                '<(ms_buildkit)/lib/libecwj2.lib',
                '<(ms_buildkit)/lib/libexpat.lib',
                '<(ms_buildkit)/lib/libfcgi.lib',
                '<(ms_buildkit)/lib/libjbig.lib',
                '<(ms_buildkit)/lib/libjpeg.lib',
                '<(ms_buildkit)/lib/libming.lib',
                '<(ms_buildkit)/lib/libmysql.lib',
                '<(ms_buildkit)/lib/libpng.lib',
                '<(ms_buildkit)/lib/libpq.lib',
                '<(ms_buildkit)/lib/libpqdll.lib',
                '<(ms_buildkit)/lib/libtiff_i.lib',
                '<(ms_buildkit)/lib/libxml2.lib',
                '<(ms_buildkit)/lib/minizip.lib',
                '<(ms_buildkit)/lib/netcdf.lib',
                '<(ms_buildkit)/lib/openjp2.lib',
                '<(ms_buildkit)/lib/openjpeg.lib',
                '<(ms_buildkit)/lib/openjpegstatic.lib',
                '<(ms_buildkit)/lib/pdflib.lib',
                '<(ms_buildkit)/lib/pixman-1.lib',
                '<(ms_buildkit)/lib/poppler.lib',
                '<(ms_buildkit)/lib/proj.lib',
                '<(ms_buildkit)/lib/proj_i.lib',
                '<(ms_buildkit)/lib/spatialite.lib',
                '<(ms_buildkit)/lib/spatialite_i.lib',
                '<(ms_buildkit)/lib/sqlite3_i.lib',
                '<(ms_buildkit)/lib/ssleay32.lib',
                '<(ms_buildkit)/lib/vld.lib',
                '<(ms_buildkit)/lib/xerces-c_2.lib',
                '<(ms_buildkit)/lib/zdll.lib',
                '<(ms_buildkit)/lib/zlib.lib',
                '<(ms_buildkit)/lib/proj.lib'
            ]
        }],
      ]
    }
  ]
}
