#!/usr/bin/env node

var util     = require( "util" );

var optimist = require( "optimist" );
var express  = require( "express" );
var mysql    = require( "mysql" );
var sio      = require( "socket.io" );
var crypto   = require( "crypto" );
var moment   = require( "moment" );

var logger   = require( "./log-ng" );
var log      = new logger;

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

var ClientState =
{
  out: 0,
  idle: 1
};

function Client( socket )
{
  this.id = socket.id;
  this.socket = socket;
  this.state = ClientState.out;
  this.loginAttempts = 0;
  this.lastLoginTime = moment();
  this.name = null;
  this.address = {
    address: socket.handshake.address.address,
    port: socket.handshake.address.port
  };
  this.token = socket.handshake.randomToken;
}

Client.prototype.toJSON = function()
{
  return {
    id: this.id,
    state: this.state,
    address: this.address,
    name: this.name
  };
};

Client.prototype.onConnect = function()
{
  log.info( "chat: client connected " + this.id );
  this.socket.emit( "ngc_welcome",
  {
    version: ChatNg.version,
    protocol: ChatNg.protocolVersion,
    token: this.token
  });
};

Client.prototype.onDisconnect = function()
{
  log.info( "chat: client disconnected " + this.id );
};

var DataBackend =
{
  dbPool: null,
  init: function()
  {
    dbPool = mysql.createPool(
    {
      host: argv.host,
      user: argv.user,
      password: argv.pass,
      database: argv.db,
      socketPath: argv.sock,
      charset: "UTF8_GENERAL_CI",
      timezone: "local",
      supportBigNumbers: true,
      bigNumberStrings: true
    } );
  },
  loginHash: function( username, password )
  {
    var hash = crypto.createHash( "sha1" );
    hash.update( username + password );
    return hash.digest( "hex" );
  }
/*
    dbPool.getConnection( function( err, connection ) {
      if ( err ) {
        socket.emit( "test", "Database error: " + err );
      } else {
        connection.query( "SELECT member_name,passwd,password_salt FROM smf_members", function( err, rows )
        {
          if ( !err )
            socket.emit( "test", rows );
        } );
        connection.release();
      }
    } );
*/
};

var ChatNg =
{
  backend: null,
  version: [ 0, 0, 1 ],
  protocolVersion: 0,
  options: {
    tokenBytes: 16
  },
  init: function()
  {
    log.info( "chat-ng daemon v" + this.version.join( "." ) );
    this.backend = DataBackend;
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
    var client = new Client( socket );
    socket.set( "client", client );
    socket.on( "disconnect", function(){
      client.onDisconnect.call( client );
    });
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
io.set( "transports", ["websocket"] );
io.set( "heartbeats", true );
io.set( "destroy upgrade", true );
io.set( "browser client", true );
io.set( "browser client cache", true );
io.set( "close timeout", 30 );
io.set( "heartbeat timeout", 60 );
io.set( "heartbeat interval", 30 );
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
