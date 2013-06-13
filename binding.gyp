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
            '-Wall'
          ],
        }],
      ]
    }
  ]
}
