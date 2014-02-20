## -*- docker-image-name: "homme/node-mapserv:latest" -*-

##
# Node Mapserv
#
# This creates an Ubuntu derived base image that installs a recent
# version of Node.js as well as the latest repository checkouts of
# Mapserver and the Node Mapserv bindings.  Mapserver has a broad
# range of compile time options enabled and as such this provides a
# suitable base image for both experimenting with and deriving
# production ready images from.
#

FROM ubuntu:quantal

MAINTAINER Homme Zwaagstra <hrz@geodata.soton.ac.uk>

# Ensure the package repository is up to date
RUN echo "deb http://archive.ubuntu.com/ubuntu quantal main universe" > /etc/apt/sources.list
RUN apt-get update

# Install basic dependencies
RUN apt-get install -y software-properties-common python-software-properties python g++ make cmake wget git

# Install the ubuntu gis and Node repositories
RUN add-apt-repository -y ppa:ubuntugis/ubuntugis-unstable
RUN add-apt-repository -y ppa:chris-lea/node.js
RUN apt-get update

# Install Node.js 
RUN apt-get install -y nodejs

# Install mapserver dependencies provided by Ubuntu repositories
RUN apt-get install -y libxml2-dev \
    libxslt1-dev \
    libproj-dev \
    libfribidi-dev \
    libcairo2-dev \
    libsvg-cairo \
    libmysqlclient-dev \
    libpq-dev \
    libcurl4-gnutls-dev \
    libexempi-dev \
    libgdal-dev \
    libgeos-dev

# Install libharfbuzz from source as it is not in a repository
RUN cd /tmp && wget http://www.freedesktop.org/software/harfbuzz/release/harfbuzz-0.9.19.tar.bz2 && \
    tar xjf harfbuzz-0.9.19.tar.bz2 && \
    cd harfbuzz-0.9.19 && \
    ./configure && \
    make && \
    make install && \
    ldconfig

# Install Mapserver itself
RUN git clone --depth=0 https://github.com/mapserver/mapserver/ /usr/local/src/mapserver
RUN mkdir /usr/local/src/mapserver/build && \
    cd /usr/local/src/mapserver/build && \
    cmake ../ -DWITH_THREAD_SAFETY=1 \
        -DWITH_PROJ=1 \
        -DWITH_KML=1 \
        -DWITH_SOS=1 \
        -DWITH_WMS=1 \
        -DWITH_FRIBIDI=1 \
        -DWITH_HARFBUZZ=1 \
        -DWITH_ICONV=1 \
        -DWITH_CAIRO=1 \
        -DWITH_SVGCAIRO=1 \
        -DWITH_MYSQL=1 \
        -DWITH_GEOS=1 \
        -DWITH_POSTGIS=1 \
        -DWITH_GDAL=1 \
        -DWITH_OGR=1 \
        -DWITH_CURL=1 \
        -DWITH_CLIENT_WMS=1 \
        -DWITH_CLIENT_WFS=1 \
        -DWITH_WFS=1 \
        -DWITH_WCS=1 \
        -DWITH_LIBXML2=1 \
        -DWITH_GIF=1 \
        -DWITH_EXEMPI=1 \
        -DWITH_XMLMAPFILE=1 \
	-DWITH_FCGI=0 && \
    make && \
    make install && \
    ldconfig

# Install Node Mapserv. This installs to `/node_modules` so will always be found
RUN git clone https://github.com/geo-data/node-mapserv/ /usr/local/src/node-mapserv
RUN npm config set mapserv:build_dir /usr/local/src/mapserver/build && \
    npm install /usr/local/src/node-mapserv

# Run the Node Mapserv tests by default
CMD npm test mapserv
