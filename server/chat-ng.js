#!/usr/bin/env node

var util     = require( "util" );

var optimist = require( "optimist" );
var express  = require( "express" );
var sio      = require( "socket.io" );
var crypto   = require( "crypto" );
var moment   = require( "moment" );

var logger   = require( "./log-ng" );
var log      = new logger;

var backend  = require( "./chat.backend.smf" );

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
  disconnected: 0,
  connected: 1,
  idle: 2
};

var AuthResult =
{
  ok: 0,
  error: 1,
  badUser: 2,
  badPassword: 3
};

var ClientExceptionCode =
{
  transportError: 0,
  protocolError: 1,
  applicationError: 2
}

function ClientException( code, message )
{
  this.code     = code;
  this.message  = message;
  this.toString = function()
  {
    return "ClientException(" + this.code + "): " + this.message;
  };
}

function User( id, name )
{
  this.id = id;
  this.name = name;
}
User.prototype.toJSON = function()
{
  return {
    id: this.id,
    name: this.name
  }
}

function Client( owner, socket )
{
  this._owner = owner;
  this.id = socket.id;
  this.socket = socket;
  this.state = ClientState.disconnected;
  this.loginAttempts = 0;
  this.address = {
    address: socket.handshake.address.address,
    port: socket.handshake.address.port
  };
  this.user = null;
  this.token = socket.handshake.randomToken;
}
Client.prototype.toJSON = function()
{
  return {
    id: this.id,
    state: this.state,
    address: this.address,
    user: this.user
  };
};
Client.prototype.changeState = function( newState )
{
  if ( this.state == newState )
    return false;
  this.state = newState;
  return true;
};
Client.prototype.onConnect = function()
{
  if ( !this.changeState( ClientState.connected ) )
    return;
  log.info( "Chat: Client connected " + this.id );
  this.loginAttempts = 0;
  this.sendWelcome();
};
Client.prototype.sendWelcome = function()
{
  this.socket.emit( "ngc_welcome",
  {
    version: this._owner.version,
    protocol: this._owner.protocolVersion,
    token: this.token
  });
};
Client.prototype.onAuth = function( data )
{
  if ( this.state != ClientState.connected )
    throw new ClientException( ClientExceptionCode.protocolError, "ngc_auth out of state" );
  this.loginAttempts++;
  this._owner.backend.userQuery( this, data.user, function( error, user )
  {
    if ( error ) {
      log.info( "Chat: User auth failed, db error" );
      this.sendAuth( AuthResult.error, null );
    } else {
      if ( user === null ) {
        log.info( "Chat: User auth failed, bad user" );
        this.sendAuth( AuthResult.badUser, null );
      } else {
        var hash = crypto.createHash( "sha1" );
        hash.update( user.hash + this.token );
        hash = hash.digest( "hex" );
        if ( data.hash === hash ) {
          log.info( "Chat: User auth ok: " + user.name );
          this.user = new User( user.id, user.name );
          this.changeState( ClientState.idle );
          this.sendAuth( AuthResult.ok, this.user );
        } else {
          log.info( "Chat: User auth failed, bad password" );
          this.sendAuth( AuthResult.badPassword, null );
        }
      }
    }
  });
};
Client.prototype.sendAuth = function( result, data )
{
  this.socket.emit( "ngc_auth",
  {
    code: result,
    user: data ? data.toJSON() : null
  });
};
Client.prototype.onDisconnect = function()
{
  if ( !this.changeState( ClientState.disconnected ) )
    return;
  log.info( "Chat: Client disconnected " + this.id );
  this.user = null;
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
    var client = new Client( ChatNg, socket );
    socket.set( "client", client );
    socket.on( "disconnect", function(){
      client.onDisconnect.call( client );
    });
    socket.on( "ngc_auth", function( data ){
      client.onAuth.call( client, data );
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
