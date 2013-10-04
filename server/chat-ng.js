#!/usr/bin/env node

var util        = require( "util" );

var optimist    = require( "optimist" );
var express     = require( "express" );
var sio         = require( "socket.io" );
var crypto      = require( "crypto" );

var logger      = require( "./chat.logger" );
var log         = new logger;

var backend     = require( "./chat.backend.smf" );
var chatclient  = require( "./chat.client" );

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
.argv;

if ( ( typeof argv.sock != "string"
  && !( argv.sock instanceof String ) )
  || argv.sock.length < 1 || argv.nosock )
  argv.sock = null;

var ChatNg =
{
  "log": log,
  backend: null,
  version: [ 0, 0, 1 ],
  protocolVersion: 0,
  options: {
    tokenBytes: 16
  },
  init: function()
  {
    log.info( "chat-ng daemon v" + this.version.join( "." ) );
    this.backend = backend.create({
      host: argv.host,
      user: argv.user,
      password: argv.pass,
      socket: argv.sock,
      db: argv.db
    }, log );
  },
  getIndex: function( req, res )
  {
    res.send( "chat-ng index" );
  },
  getStatus: function( req, res )
  {
    var body = [];
    io.sockets.clients().forEach( function( socket )
    {
      socket.get( "client", function( dummy, client )
      {
        if ( client )
          body.push( client.toJSON() );
      } );
    } );
    res.json( body );
  },
  onAuthorization: function( handshake, callback )
  {
    var bytes = crypto.randomBytes( ChatNg.options.tokenBytes );
    handshake.randomToken = bytes.toString( "base64" );
    callback( null, true );
  },
  onConnection: function( socket )
  {
    var client = chatclient.create( ChatNg, socket );
    client.onConnect();
  },
  onHeartbeat: function()
  {
    // var clients = io.sockets.clients();
    // ...
  }
};

ChatNg.init();

var app = express();

app.get( "/", ChatNg.getIndex );
app.get( "/status", ChatNg.getStatus );

var server = app.listen( argv.p );

var io = sio.listen( server );
io.set( "origins", argv.origin + ":*" );
io.set( "log level", argv.debug ? 3 : 2 );
io.set( "logger", log );
io.set( "transports", ["websocket"] );
io.set( "heartbeats", true );
io.set( "destroy upgrade", true );
io.set( "browser client", true );
io.set( "browser client cache", true );
io.set( "close timeout", 60 );
io.set( "heartbeat timeout", 60 );
io.set( "heartbeat interval", 25 );
io.set( "polling duration", 20 );
if ( !argv.debug )
{
  io.enable( "browser client minification" );
  io.enable( "browser client etag" );
  io.enable( "browser client gzip" );
}
io.of( "/chat" ).authorization( ChatNg.onAuthorization ).on( "connection", ChatNg.onConnection );

log.info( "listening on " + server.address().address + ":" + server.address().port );
log.info( "debug: " + argv.debug );
