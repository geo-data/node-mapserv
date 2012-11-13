{
  "targets": [
    {
      "target_name": "bindings",
      "sources": [
        "src/node-mapserv.cpp",
        "src/map.cpp",
        "src/node-mapservutil.c"
      ],
      "conditions": [
        ['OS=="linux"', {
          'ldflags': [
            '-Wl,--no-as-needed,-lmapserver'
          ],
          'libraries': [
            '<!@(mapserver-config --libs)'
          ],
          'cflags': [
            '<!@(mapserver-config --cflags)',
            '-Wall'
          ],
        }],
      ]
    }
  ]
}
