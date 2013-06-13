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
            '-Wl,--no-as-needed,-lmapserver',
            '<!@(python tools/config.py --ldflags)'
          ],
          'libraries': [
            '<!@(python tools/config.py --libraries)'
          ],
          'cflags': [
            '<!@(python tools/config.py --cflags)',
            '-Wall'
          ],
        }],
      ]
    }
  ]
}
