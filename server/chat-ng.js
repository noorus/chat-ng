#!/usr/bin/env node

var util        = require( "util" );

var optimist    = require( "optimist" );
var express     = require( "express" );

var logger      = require( "./chat.logger" );
var log         = logger.create();

var chatserver  = require( "./chat.server" );

var argv = optimist
.options( "port", { alias: "p", default: 3000 } )
.options( "host", { default: "localhost" } )
.options( "sock", { default: "/var/run/mysqld/mysqld.sock" } )
.options( "user", { default: "root" } )
.options( "pass", { default: "" } )
.options( "db",   { default: "chat" } )
.options( "origin", { default: "*" } )
.options( "debug", { boolean: true, default: false } )
.options( "nosock", { boolean: true, default: false } )
.options( "backend", { default: "smf" } )
.options( "tableprefix", { default: "smf" } )
.argv;

var chatbackend = require( "./chat.backend." + argv.backend );

if ( ( typeof argv.sock != "string"
  && !( argv.sock instanceof String ) )
  || argv.sock.length < 1 || argv.nosock )
  argv.sock = null;

var backend = chatbackend.create(
{
  host: argv.host,
  user: argv.user,
  password: argv.pass,
  socket: argv.sock,
  db: argv.db,
  prefix: argv.tableprefix
}, log );

backend.init( function()
{
  var app = express();
  var server = app.listen( argv.p );

  var settings = {
    origin: argv.origin,
    debug: argv.debug
  };

  var ng = chatserver.create( app, server, "", settings, backend, log );
  app.get( "/", function( request, response )
  {
    ng.getIndex.call( ng, request, response );
  });
  app.get( "/status", function( request, response )
  {
    ng.getStatus.call( ng, request, response );
  });
  app.get( "/avatar/:id", function( request, response )
  {
    ng.getAvatar.call( ng, request, response );
  });
});
