var util        = require( "util" );
var socketio    = require( "socket.io" );
var crypto      = require( "crypto" );
var chatclient  = require( "./chat.client" );
var backlog     = require( "./backlog" );

function Server( app, server, prefix, settings, backend, log )
{
  this.log = log;
  this.backend = backend;
  this.backlog = backlog.create( 20 );
  this.version = [ 0, 0, 1 ];
  this.protocolVersion = 0;
  this.debug = settings.debug;
  this.options = {
    tokenBytes: 16
  };
  this.io = socketio.listen( server );
  this.io._owner = this;
  this.io.set( "origins", settings.origin + ":*" );
  this.io.set( "log level", settings.debug ? 3 : 2 );
  this.io.set( "logger", this.log );
  this.io.set( "transports", ["websocket", "htmlfile", "xhr-polling", "jsonp-polling"] );
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

Server.prototype.preClientAuthed = function( userid )
{
  var clients = this.io.sockets.clients();
  clients.forEach( function( socket )
  {
    socket.get( "client", function( dummy, client )
    {
      if ( client && client.user && client.user.id == userid )
      {
        client.kickOut( "Rejoined from elsewhere" );
      }
    });
  });
};

Server.prototype.sendPublicPacket = function ( packet_id, packet_data ) 
{
  this.log.debug("sending a backlogged packet");
  this.io.sockets.in( "authed" ).emit( packet_id, packet_data );
  this.backlog.push( {"id": packet_id, "data": packet_data} );
};

Server.prototype.onClientAuthed = function( client )
{
  this.sendBacklog( client );
  this.sendWhoTo( client );
  client.socket.join( "authed" );
  this.sendPublicPacket( "ngc_join", { user: client.user.toJSON() } );
};

Server.prototype.onClientMessage = function( client, message, timestamp )
{
  this.sendPublicPacket( "ngc_msg", { 
    user: client.user.toJSON(), 
    "message": message,
    "timestamp": timestamp.format()
  });
};

Server.prototype.onClientWhisper = function( sclient, target, message, timestamp ) 
{ 
  var packet = null;
  var that = this;
  this.io.sockets.in( "authed" ).clients().forEach(function ( socket ) 
  {
    socket.get( "client", function( dummy, client ) 
    {
      if ( client && client.isVisible() && client.user.name === target )
      {
	that.log.debug("found recipient, " + client.user.name);
        packet = { 
          user: sclient.user.toJSON(), 
          target: client.user.toJSON(), 
          "message": message,
          "timestamp": timestamp
        };
        socket.emit( "ngc_whisper", packet);
      } 
    });
  });
  if (!!packet) 
  {
    // message delivered, echo it back
    sclient.socket.emit( "ngc_whisper", packet);
  }
}

Server.prototype.onClientDisconnected = function( client )
{
  if ( client.user )
    this.sendPublicPacket( "ngc_leave", { user: client.user.toJSON() } );
};

Server.prototype.broadcastJoin = function( client )
{
  var clients = this.io.sockets.clients();
  clients.forEach( function( socket )
  {
    socket.get( "client", function( dummy, client )
    {
      if ( client && client.isVisible() && client.user )
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
      if ( client && client.isVisible() && client.user && client.id != sclient.id )
        who.push( client.user.toJSON() );
    });
  });
  sclient.socket.emit( "ngc_who",
  {
    users: who
  });
};

Server.prototype.sendBacklog = function( sclient )
{
  var packets = this.backlog.read();
  for ( var i=0; i < packets.length; i++ ) {
    var packet = packets[i];
    sclient.socket.emit(packet.id, packet.data);
  }
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
  var clients = [];
  if ( this.debug )
  {
    this.io.sockets.clients().forEach( function( socket )
    {
      socket.get( "client", function( dummy, client )
      {
        if ( client )
          clients.push( client.toJSON() );
      });
    });
  }
  var body = {
    "platform": process.platform,
    "architechture": process.arch,
    "memory": util.inspect( process.memoryUsage() ),
    "uptime": process.uptime(),
    "clients": clients
  };
  response.json( body );
};

Server.prototype.getAvatar = function( request, response )
{
  this.backend.userAvatarQuery( this, request.params.id, function( error, avatar )
  {
    if ( !avatar )
      return response.send( 404, "No avatar" );
    if ( avatar.remote )
      return response.redirect( 302, avatar.path );
    response.header( "Content-Type", avatar.mime );
    return response.sendfile( avatar.path );
  });
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
