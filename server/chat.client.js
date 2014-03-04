var crypto = require( "crypto" );
var moment = require( "moment" );
var chatuser = require( "./chat.user" );

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

function Client( owner, socket )
{
  this._owner = owner;

  socket.set( "client", this );
  socket.on( "disconnect", function() {
    this.get( "client", function( dummy, client ) {
      client.onDisconnect.call( client );
    });
  });
  socket.on( "ngc_auth", function( data ) {
    this.get( "client", function( dummy, client ) {
      client.onAuth.call( client, data );
    });
  });
  socket.on( "ngc_msg", function( data ) {
    this.get( "client", function( dummy, client ) {
      client.onMsg.call( client, data );
    });
  });
  socket.on( "ngc_whisper", function( data ) {
    this.get( "client", function( dummy, client ) {
      client.onWhisper.call( client, data );
    });
  });

  this.id = socket.id;
  this.socket = socket;
  this.state = ClientState.disconnected;
  this.connectTime = null;
  this.loginAttempts = 0;
  this.lastLoginTime = null;
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
    user: this.user ? this.user.toJSON() : null
  };
};

Client.prototype.isVisible = function()
{
  return this.state == ClientState.idle;
};

Client.prototype.log = function( message )
{
  this._owner.log.info( "[" + this.id + "] " + message );
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
  this.log( "Connected from " + this.address.address + ":" + this.address.port );
  this.connectTime = moment().utc();
  this.loginAttempts = 0;
  this.lastLoginTime = null;
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
  {
    this.onError( new ClientException( ClientExceptionCode.protocolError, "NGC_Auth out of state" ));
    return;
  }

  this.loginAttempts++;
  this.lastLoginTime = moment().utc();
  this._owner.backend.userQuery( this, data.user, function( error, user )
  {
    if ( error ) {
      this.log( "Authentication as \"" + data.user + "\" failed, database error!" );
      this.sendAuth( AuthResult.error, null );
      return;
    }
    if ( user === null ) {
      this.log( "Authentication as \"" + data.user + "\" failed, bad account" );
      this.sendAuth( AuthResult.badUser, null );
      return;
    }
    var hash = crypto.createHash( "sha1" );
    hash.update( user.hash + this.token );
    hash = hash.digest( "hex" );
    if ( data.hash === hash ) {
      this.log( "Authenticated as \"" + user.name + "\"" );
      this._owner.backend.userAvatarQuery( this, user.id, function( error, avatar )
      {
        this._owner.preClientAuthed( user.id );
        this.user = chatuser.create( user.id, user.name, ( !error && avatar ) ? true : false, chatuser.userLevel.regular );
        this.changeState( ClientState.idle );
        this.sendAuth( AuthResult.ok, this.user );
        this._owner.onClientAuthed( this );
      });
    } else {
      this.log( "Authentication as \"" + user.name + "\" failed, bad password" );
      this.sendAuth( AuthResult.badPassword, null );
    }
  });
};

Client.prototype.onMsg = function( data )
{
  if ( this.state != ClientState.idle )
  {
    this.onError( new ClientException( ClientExceptionCode.protocolError, "NGC_Msg out of state" ));
    return;
  }
  this._owner.onClientMessage( this, data.msg, moment.utc() );
};

Client.prototype.onWhisper = function( data ) 
{
  if ( this.state != ClientState.idle ) 
  {
    this.onError( new ClientException( ClientExceptionCode.protocolError, "NGC_Whisper out of state" ));
    return;
  }
  this._owner.onClientWhisper( this, data.target, data.msg, moment.utc() );
}

Client.prototype.sendAuth = function( result, data )
{
  this.socket.emit( "ngc_auth",
  {
    code: result,
    user: data ? data.toJSON() : null
  });
};

Client.prototype.sendJoin = function( user )
{
  this.socket.emit( "ngc_join",
  {
    "user": user.toJSON()
  });
};

Client.prototype.sendLeave = function( user )
{
  this.socket.emit( "ngc_leave",
  {
    "user": user.toJSON()
  });
};

Client.prototype.kickOut = function( message )
{
  this.socket.emit( "ngc_close",
  {
    "message": message
  });
  this.socket.disconnect();
};

Client.prototype.onError = function( e ) 
{
  this.socket.disconnect();
  this.log( "An error occurred: " + e.toString() );
};

Client.prototype.onDisconnect = function()
{
  if ( !this.changeState( ClientState.disconnected ) )
  {
    return;
  }
  this.log( "Disconnected" );
  this._owner.onClientDisconnected( this );
  this.user = null;
};

module.exports =
{
  create: function( owner, socket )
  {
    return new Client( owner, socket );
  }
};
