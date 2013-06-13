#!/bin/bash

##
# Mapserver regression testing script for use with `git bisect run`
#
# Commits in mapserver will sometimes cause the node-mapserv test suite to
# fail.  This script can be used in conjunction with `git bisect run` to find
# out which mapserver commit caused the failure: basically it builds and
# installs mapserver, builds node-mapserv against the install, tests
# node-mapserv and passes the test exit status back to `git bisect`
#
# Example: Assume you have a situation where mapserver `HEAD` has a change that
# is failing the node-mapserv test suite. You know for a fact that the commit
# tagged `rel-6-2-0` passed the test suite.  Your Mapserver checkout is in
# `/tmp/mapserver`; you are installing mapserver to `/tmp/mapserver-install`;
# your node-mapserv checkout is at `/tmp/node-mapserv`: you would run the
# following commands to find the commit which introduced the change that caused
# the test suite to fail:
#
#    cd /tmp/mapserver
#    git bisect start HEAD rel-6-2-0 --
#    git bisect run /tmp/node-mapserv/tools/git-bisect-run.sh /tmp/mapserver-install
#
# N.B. You may need to change the `cmake` or `./configure` arguments to suit
# your environment.
#

INSTALL_PREFIX=$1               # where is mapserver going to be installed?
GIT_DIR=`pwd`                   # cache the working directory
NODE_MAPSERV_DIR="$( dirname "$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )" )" # where is the node-mapserv root directory?

# build and install mapserver
cd $GIT_DIR
git status --short | cut -b 4- | xargs rm -rf
if [ -f ./CMakeLists.txt ]; then # it's a cmake build
    cmake CMakeLists.txt -DWITH_THREADS=1 -DCMAKE_PREFIX_PATH=${INSTALL_PREFIX}/ -DCMAKE_INSTALL_PREFIX=${INSTALL_PREFIX}/;
else                            # it's an autotools build
    ./configure --prefix=${INSTALL_PREFIX}/ --with-threads; 
fi
make && make install

# build and test node-mapserv
cd $NODE_MAPSERV_DIR
rm -rf build
PATH="${INSTALL_PREFIX}/bin:${PATH}" npm_config_mapserv_build_dir=$GIT_DIR ./node_modules/.bin/node-gyp --debug configure build
./node_modules/.bin/vows --spec ./test/mapserv-test.js
EXIT=$?                         # get the exit status from vows

# Ensure segmentation faults are tested for: `git bisect run` fails when there
# is an exit code >= 129 - segmentation faults return 139 so we must downgrade
# them
if [ $EXIT -eq 139 ]; then EXIT=2; fi;

# clean up
cd $GIT_DIR
#git status --short | cut -b 4- | xargs rm -rf

# return the vows exit status to git-bisect
exit $EXIT
