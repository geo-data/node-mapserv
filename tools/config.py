#!/usr/bin/env python2

##############################################################################
# Copyright (c) 2012, GeoData Institute (www.geodata.soton.ac.uk)
# All rights reserved.
#
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions are met:
#
#  - Redistributions of source code must retain the above copyright notice,
#    this list of conditions and the following disclaimer.
#
#  - Redistributions in binary form must reproduce the above copyright notice,
#    this list of conditions and the following disclaimer in the documentation
#    and/or other materials provided with the distribution.
#
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
# AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
# IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
# ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
# LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
# CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
# SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
# INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
# CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
# ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
# POSSIBILITY OF SUCH DAMAGE.
##############################################################################

"""
Output mapserver configuration information to `node-gyp`

Configuration options are retrieved from environment variables set using `npm
config set`.  This allows for a simple `npm install mapserv` to work.
"""

from optparse import OptionParser
import os, sys
import re

def warn(msg):
    print >> sys.stderr, msg

def die(msg):
    warn('Configuration failed: %s' % msg)
    sys.exit(1)

class ConfigError(Exception):
    pass

class Config(object):
    """Base class for obtaining Mapserver configuration information"""

    def __init__(self, build_dir):
        self.build_dir = build_dir

    def getLibDir(self):
        return ''

    def getIncludeDir(self):
        return os.path.join(self.build_dir)

    def getLdflags(self):
        lib_dir = self.getLibDir()
        ldflags = ''
        if lib_dir:
            # write the library path into the resulting binary
            ldflags += "-Wl,-rpath=%s -L%s\n" % (lib_dir, lib_dir)
        return ldflags

    def getCflags(self):
        return ''

class AutoconfConfig(Config):
    """Class for obtaining mapserver configuration pre mapserver 6.4

    Mapserver uses autotools for building and configuration in this version.
    """

    def __init__(self, *args, **kwargs):
        super(AutoconfConfig, self).__init__(*args, **kwargs)
        makefile = os.path.join(self.build_dir, 'Makefile')
        if not os.path.exists(makefile):
            raise ConfigError('Expected `Makefile` in %s' % self.build_dir)

        self.makefile = makefile

    def iterMakefile(self):
        """
        Iterate over the contents of the `Makefile`

        This additionally checks to ensure that Mapserver has been compiled
        with threads, raising an error if this is not the case.
        """
        with_threads = False
        p = re.compile('^THREAD *= *(.*)$')
        with open(self.makefile, 'r') as f:
            for line in f:
                match = p.match(line)
                if match:
                    with_threads = bool(match.groups()[0].strip())
                yield line.rstrip()
        if not with_threads:
            raise ConfigError('Mapserver has not been compiled with support for threads')

    def getLibDir(self):
        p = re.compile('^prefix\s*=\s*(.+)$') # match the prefix
        libdir = ''
        for line in self.iterMakefile():
            match = p.match(line)
            if match:
                arg = match.groups()[0].strip()
                if arg:
                    # we don't return here to let iterMakefile iterate over the
                    # whole file performing its thread check
                    libdir = os.path.join(arg, 'lib')
        return libdir

    def getCflags(self):
        # add includes from the Makefile
        p = re.compile('^[A-Z]+_INC *= *(.+)$') # match an include header
        matches = []
        for line in self.iterMakefile():
            match = p.match(line)
            if match:
                arg = match.groups()[0].strip()
                if arg:
                    matches.append(arg)

        return ' '.join(matches)

class CmakeConfig(Config):
    """Class for obtaining Mapserver configuration for versions >= 6.4

    Mapserver uses Cmake for building and configuration in this version.
    """

    def __init__(self, *args, **kwargs):
        super(CmakeConfig, self).__init__(*args, **kwargs)
        cmake_cache = os.path.join(self.build_dir, 'CMakeCache.txt')
        if not os.path.exists(cmake_cache):
            raise ConfigError('Expected `CMakeCache.txt` in %s' % self.build_dir)

        self.cmake_cache = cmake_cache

    def iterCmakeCache(self):
        """
        Iterate over the contents of the `CmakeCache.txt` file

        This additionally checks to ensure that Mapserver has been compiled
        with threads, raising an error if this is not the case.
        """
        with_threads = False
        p = re.compile('^WITH_THREADS:BOOL *= *(.+)$')
        with open(self.cmake_cache, 'r') as f:
            for line in f:
                match = p.match(line)
                if match:
                    with_threads = match.groups()[0].strip() in ('ON', '1')
                yield line
        if not with_threads:
            raise ConfigError('Mapserver has not been compiled with support for threads')

    def getLibDir(self):
        p = re.compile('^CMAKE_INSTALL_PREFIX:PATH *= *(.+)$') # match the prefix
        lib_dir = ''
        for line in self.iterCmakeCache():
            match = p.match(line)
            if match:
                arg = match.groups()[0].strip()
                if arg:
                    # we don't return here to let iterCmakeCache iterate over
                    # the whole file performing its thread check
                    lib_dir = os.path.join(arg, 'lib')

        return lib_dir

    def getIncludeDir(self):
        dirs = []
        patterns = [
            re.compile('^\w+_INCLUDE_DIR:PATH *= *(.+)$'), # match a library directory
            re.compile('^MapServer_(?:SOURCE|BINARY)_DIR:STATIC *= *(.+)$') # match the mapserver directories
            ]

        for line in self.iterCmakeCache():
            for p in patterns:
                match = p.match(line)
                if match:
                    arg = match.groups()[0].strip()
                    if arg:
                        dirs.append(arg)
                    continue # skip the other patterns

        return ' '.join(dirs)


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

parser.add_option("--cflags",
                  action="store_true", default=False,
                  help="output the mapserver cflag options")

(options, args) = parser.parse_args()

try:
    build_dir = os.environ['npm_config_mapserv_build_dir']
except KeyError:
    die('`npm config set mapserv:build_dir` has not been called')

# get the config object, trying the legacy autoconf build sytem first and
# falling back to the new cmake system
try:
    try:
        config = CmakeConfig(build_dir)
    except ConfigError, e:
        try:
            config = AutoconfConfig(build_dir)
        except ConfigError, e2:
            warn("Failed to configure using Cmake: %s" % e)
            warn("Attempting configuration using autotools...")
            die(e2)

    # output the requested options
    if options.include:
        print config.getIncludeDir()

    if options.libraries:
        lib_dir = config.getLibDir()
        if lib_dir:
            print "-L%s" % lib_dir

    if options.ldflags:
        print config.getLdflags()

    if options.cflags:
        print config.getCflags()

except ConfigError, e:
    die(e)
