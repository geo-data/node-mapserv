# Node Mapserv

`node-mapserv` is a Node.js addon which bakes the functionality
provided by the Mapserver `mapserv` CGI program directly into Node: it
is assumed that you are familiar with using `mapserv` and creating
mapfiles.  `node-mapserv` is best thought of as a wrapper around CGI
`mapserv`.  It is *not* MapScript for Node.js.  Instead it provides a
declarative method for rendering mapserver mapfiles with the following
benefits:

- All the considerable functionality of CGI `mapserv` is at your
  disposal.

- Operations involving I/O (such as parsing mapfiles and rendering
  maps) is performed asynchronously in child threads
