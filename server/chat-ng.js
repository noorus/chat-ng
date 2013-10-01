#!/usr/bin/env node

var optimist = require( "optimist" );
var express  = require( "express" );
var mysql    = require( "mysql" );
var sio      = require( "socket.io" );
var crypto   = require( "crypto" );
var moment   = require( "moment" );

var argv = optimist
.options( "port", { alias: "p", default: 3000 } )
.options( "host", { default: "localhost" } )
.options( "sock", { default: null } )
.options( "user", { default: "root" } )
.options( "pass", { default: "" } )
.options( "db",   { default: "chat" } )
.options( "origin", { default: "*" } )
.options( "debug", { boolean: true, default: false } )
.argv;

var ClientState =
{
  out: 0,
  idle: 1
};

function Client( id )
{
  this.id = id;
  this.state = ClientState.out;
  this.loginAttempts = 0;
  this.lastLoginTime = moment();
  this.name = null;
}

Client.prototype.toJSON = function()
{
  return { state: this.state };
};

var DataBackend =
{
  loginHash: function( username, password )
  {
    var hash = crypto.createHash( "sha1" );
    hash.update( username + password )
    return hash.digest( "hex" );
  }
};

var ChatNg =
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
  getIndex: function( req, res )
  {
    res.send( "chat-ng index" );
  },
  getStatus: function( req, res )
  {
    res.send( "chat-ng status" );
  },
  onAuthorization: function( handshakeData, callback )
  {
    console.log( "ChatNg.onAuthorization" );
    callback( null, true );
  },
  onConnection: function( socket )
  {
    console.log( "ChatNg.onConnection" );
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
io.set( "transports", ["websocket","htmlfile","xhr-polling","jsonp-polling"] );
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

console.info( "Listening on http://%s:%d",
  server.address().address,
  server.address().port
);
console.info( "Debug: " + argv.debug );
