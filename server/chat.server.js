var socketio    = require( "socket.io" );
var crypto      = require( "crypto" );
var chatclient  = require( "./chat.client" );

function Server( app, server, prefix, settings, backend, log )
{
  this.log = log;
  this.backend = backend;
  this.version = [ 0, 0, 1 ];
  this.protocolVersion = 0;
  this.options = {
    tokenBytes: 16
  };
  this.io = socketio.listen( server );
  this.io._owner = this;
  this.io.set( "origins", settings.origin + ":*" );
  this.io.set( "log level", settings.debug ? 3 : 2 );
  this.io.set( "logger", this.log );
  this.io.set( "transports", ["websocket"] );
  this.io.set( "heartbeats", true );
  this.io.set( "destroy upgrade", true );
  this.io.set( "browser client", true );
  this.io.set( "browser client cache", true );
  this.io.set( "close timeout", 60 );
  this.io.set( "heartbeat timeout", 60 );
  this.io.set( "heartbeat interval", 25 );
  this.io.set( "polling duration", 20 );
  if ( !settings.debug )
  {
    this.io.enable( "browser client minification" );
    this.io.enable( "browser client etag" );
    this.io.enable( "browser client gzip" );
  }
  this.io.set( "authorization",
    function( handshake, callback )
    {
      this._owner.onAuthorization.call( this._owner, handshake, callback );
    }
  );
  this.io.on( "connection",
    function( socket )
    {
      this._owner.onConnection.call( this._owner, socket );
    }
  );
}

Server.prototype.onClientMessage = function( client, message )
{
  this.io.sockets.in( "authed" ).emit( "ngc_msg", { user: client.user.toJSON(), "message": message } );
};

Server.prototype.onClientAuthed = function( client )
{
  this.sendWhoTo( client );
  this.io.sockets.in( "authed" ).emit( "ngc_join", { user: client.user.toJSON() } );
  client.socket.join( "authed" );
};

Server.prototype.onClientDisconnected = function( client )
{
  if ( client.user )
    this.io.sockets.in( "authed" ).emit( "ngc_leave", { user: client.user.toJSON() } );
};

Server.prototype.broadcastJoin = function( client )
{
  var clients = this.io.sockets.clients();
  clients.forEach( function( socket )
  {
    socket.get( "client", function( dummy, client )
    {
      if ( client && client.isVisible && client.user )
        who.push( client.user.toJSON() );
    });
  });
};

Server.prototype.sendWhoTo = function( sclient )
{
  var who = [];
  var clients = this.io.sockets.clients();
  clients.forEach( function( socket )
  {
    socket.get( "client", function( dummy, client )
    {
      if ( client && client.isVisible && client.user && client.id != sclient.id )
        who.push( client.user.toJSON() );
    });
  });
  sclient.socket.emit( "ngc_who",
  {
    users: who
  });
};

Server.prototype.onAuthorization = function( handshake, callback )
{
  var bytes = crypto.randomBytes( this.options.tokenBytes );
  handshake.randomToken = bytes.toString( "base64" );
  callback( null, true );
};

Server.prototype.onConnection = function( socket )
{
  var client = chatclient.create( this, socket );
  client.onConnect();
};

Server.prototype.getIndex = function( request, response )
{
  response.send( "Chat-NG Server v" + this.version.join( "." ) );
};

Server.prototype.getStatus = function( request, response )
{
  var body = [];
  this.io.sockets.clients().forEach( function( socket )
  {
    socket.get( "client", function( dummy, client )
    {
      if ( client )
        body.push( client.toJSON() );
    });
  });
  response.json( body );
};

Server.prototype.heartbeat = function()
{
  // Stubb
};

module.exports =
{
  create: function( app, server, prefix, settings, backend, log )
  {
    return new Server( app, server, prefix, settings, backend, log );
  }
};