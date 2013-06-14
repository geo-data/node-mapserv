# Node Mapserv on Windows

Although Windows is not currently an officially supported platform for Node
Mapserv, the module has been successfully built on Windows by the team at
mapgears.com.  The related
[GitHub issue](https://github.com/geo-data/node-mapserv/issues/7) provides a
discussion point for general Windows issues.

## Installation

It would be nice to simplify the Windows build process to enable a simple `npm
install mapserv` (in a similar manner to the Linux build) but for now it is a
manual process along the following lines:

1. Ensure you have an appropriate version of Node and `node-gyp` installed.

2. [Download](https://github.com/geo-data/node-mapserv/tags) and unpack Node
   Mapserv.  Take note of where the `binding.gyp` file is.

3. Download the appropriate Mapserver SDK from the
   [GDAL and MapServer build SDK packages](http://www.gisinternals.com/sdk/)
   section (e.g. selecting `release-1600-dev`).  Take note of where the
   `Makefile` is.

4. Unpack the SDK and edit `binding.gyp` to change the `ms_buildkit%` variable
   to point to SDK root path.

5. Download the MapServer source from the
   [GDAL and MapServer latest release versions](http://www.gisinternals.com/sdk/)
   section (e.g. selecting `release-1600-gdal-1-10-0-mapserver-6-2-1` and then
   `release-1600-gdal-1-10-0-mapserver-6-2-1-src.zip`).

6. Unpack the Mapserver source in the root of the SDK.  Edit `binding.gyp` to
   change the `ms_root%` variable to point to the Mapserver source root path.
   
7. Adapt the SDK `Makefile` to also point to your Mapserver source root
   directory (Search for `MS_DIR`).
  
8. Build Mapserver: in a MSVS console go in the SDK directory and type `nmake
   ms`.  Ensure the libraries listed in `binding.gyp` correspond to those just
   built and edit `binding.gyp` if this isn't the case.
   
9. Build Node Mapserv: from a console in the Node Mapserv root directory type
   `npm install .`

Note again that Windows is not supported so you will have to work through
issues yourself but feel free to discuss suggestions and improvements on
GitHub.
