chat-ng
=======

A next-generation web chat application in HTML5, JavaScript & WebSockets.  
Server written for Node.js with pluggable backend modules.  
Client supports pluggable themes and emoticon packages.

### Technology

The client uses [RequireJS](http://requirejs.org/), [Ember.js](http://emberjs.com/), [Socket.io](https://github.com/LearnBoost/socket.io), [jsHashes](https://github.com/h2non/jsHashes) & [Foundation 4](http://foundation.zurb.com/).  
The server's dependencies are listed in the `package.json` file.

Installation
------------

Server dependencies are managed using the [Node Package Manager](https://npmjs.org/).  
To install the server, navigate to the `server` directory and run `npm install`.  
Run the server using `./chat-ng.js` and pass appropriate arguments to define options.

To install the client, drop everything under the `client` directory on a web server.

License
-------

Chat-NG is licensed under the MIT license.  
For full license text, see the LICENSE file.
