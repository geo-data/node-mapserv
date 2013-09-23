#!/bin/sh

##
# Install a checkout of mapserver
#
# This is used by Travis-CI for installing a version of mapserver against which
# node-mapserv can be built and tested.

die() {
    if [ -n "${1}" ]; then
        echo $1
    fi
    exit 1;
}

PREFIX=$1                       # the directory to install into
MAPSERVER_COMMIT=$2              # the commit number to checkout (optional)

if [ -z "${PREFIX}" ]; then
    die "usage: install-deps.sh PREFIX [ MAPSERVER_COMMIT ]"
fi

# clone the mapserver repository
git clone https://github.com/mapserver/mapserver.git $PREFIX/mapserver || die "Git clone failed"
cd ${PREFIX}/mapserver || die "Cannot cd to ${PREFIX}/mapserver"
if [ -n "${MAPSERVER_COMMIT}" ]; then
    git checkout $MAPSERVER_COMMIT || die "Cannot checkout ${MAPSERVER_COMMIT}"
fi

# build and install mapserver. This uses `-DWITH_THREADS` for Mapserver < 6.4
# and `-DWITH_THREAD_SAFETY` for >= 6.4: the unhandled option is ignored.
if [ -f ./CMakeLists.txt ]; then # it's a cmake build
    cmake CMakeLists.txt \
        -DWITH_THREADS=1 \
        -DWITH_THREAD_SAFETY=1 \
        -DCMAKE_INSTALL_PREFIX=${PREFIX}/mapserver-install \
        -DWITH_PROJ=0 \
        -DWITH_FRIBIDI=0 \
        -DWITH_FCGI=0 \
        -DWITH_GEOS=0 \
        -DWITH_GDAL=0 \
        -DWITH_OGR=0 \
        -DWITH_WCS=0 \
        -DWITH_WFS=0 \
        -DWITH_WMS=0 || die "cmake failed"
else                            # it's an autotools build
    autoconf || die "autoconf failed"
    ./configure --prefix=${PREFIX}/mapserver-install --with-threads || die "configure failed"
fi

make || die "make failed"
make install || die "make install failed"

# point `npm` at the build
npm config set mapserv:build_dir ${PREFIX}/mapserver
