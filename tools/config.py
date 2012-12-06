#!/usr/bin/env python2

# Output mapserver configuration information to `node-gyp`
#
# Configuration options are retrieved from environment variables set using `npm
# config set`.  This allows for a simple `npm install mapserv` to work.

from optparse import OptionParser
import os

def get_lib_dir():
    return os.environ.get('npm_config_mapserv_lib_dir', '')

parser = OptionParser()
parser.add_option("--include",
                  action="store_true", default=False,
                  help="output the mapserver include path")

parser.add_option("--libraries",
                  action="store_true", default=False,
                  help="output the mapserver library link option")

parser.add_option("--ldflags",
                  action="store_true", default=False,
                  help="output the mapserver library rpath option")

(options, args) = parser.parse_args()

if options.include:
    print os.environ.get('npm_config_mapserv_include_dir', '')

if options.libraries:
    lib_dir = get_lib_dir()
    if lib_dir:
        print "-L%s" % lib_dir

if options.ldflags:
    # write the library path into the resulting binary
    lib_dir = get_lib_dir()
    if lib_dir:
        print "-Wl,-rpath=%s" % lib_dir
