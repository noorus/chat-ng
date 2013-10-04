define(
  ["socketio","hashes"],
  function( sIO, Hashes )
  {
    var ChatExceptionCode =
    {
      transportError: 0,
      protocolError: 1,
      applicationError: 2
    };
    var ChatState =
    {
      disconnected: 0,
      connecting: 1,
      connected: 2,
      authing: 3,
      idle: 4
    };
    var ChatStateName =
    [
      "disconnected",
      "connecting",
      "connected",
      "authing",
      "idle"
    ];
    function ChatException( code, message )
    {
      this.code = code;
      this.message = message;
      this.toString = function()
      {
        return "ChatException(" + this.code + "): " + this.message;
      };
    }
    function Chat( settings )
    {
      this.settings = settings;
      this.version = [0, 0, 1];
      this.protocolVersion = 0;
      this.state = ChatState.disconnected;
      this.session = {
        token: null,
        serverVersion: null
      };
      this.socketOptions = {
        "auto connect": false
      };
      this.socket = sIO.connect( settings.endpoint, this.socketOptions );
      this.socket._owner = this;
      this.socket.on( "connecting",       function(){ this._owner.onConnecting.call( this._owner ); } );
      this.socket.on( "connect",          function(){ this._owner.onConnected.call( this._owner ); } );
      this.socket.on( "disconnect",       function(){ this._owner.onDisconnected.call( this._owner ); } );
      this.socket.on( "reconnecting",     function(){ this._owner.onConnecting.call( this._owner ); } );
      this.socket.on( "reconnect",        function(){ this._owner.onConnected.call( this._owner ); } );
      this.socket.on( "connect_failed",   function(){ this._owner.onConnectFailed.call( this._owner ); } );
      this.socket.on( "reconnect_failed", function(){ this._owner.onConnectFailed.call( this._owner ); } );
      this.socket.on( "error",            function( error ){ this._owner.onError.call( this._owner, error ); } );
      this.socket.on( "message",          function( data ){ this._owner.onMessage.call( this._owner, data ); } );
      this.socket.on( "ngc_welcome",      function( data ){ this._owner.onWelcome.call( this._owner, data ); } );
      this.socket.on( "ngc_auth",         function( data ){ this._owner.onAuth.call( this._owner, data ); } );
    }
    Chat.prototype.changeState = function( newState )
    {
      if ( this.state == newState )
        return false;
      this.state = newState;
      console.log( "Chat: State is " + ChatStateName[newState] );
      return true;
    };
    Chat.prototype.onError = function( error )
    {
      console.log( "iO: Error!" );
      console.log( error );
      if ( this.state == ChatState.disconnected )
      {
        console.log( "Server down or transport unavailable!" );
      }
    };
    Chat.prototype.onConnecting = function()
    {
      if ( !this.changeState( ChatState.connecting ) )
        return;
      console.log( "iO: Connecting" );
    };
    Chat.prototype.onConnected = function()
    {
      if ( !this.changeState( ChatState.connected ) )
        return;
      console.log( "iO: Connected" );
    };
    Chat.prototype.onMessage = function( data )
    {
      console.log( "iO: Message" );
      console.log( data );
    };
    Chat.prototype.onWelcome = function( data )
    {
      console.log( "iO: Packet NGC_Welcome" );
      if ( this.state != ChatState.connected )
        throw new ChatException( ChatExceptionCode.protocolError, "ngc_welcome out of state" );
      if ( this.protocolVersion != data.protocol )
        throw new ChatException( ChatExceptionCode.protocolError,
          "protocol version mismatch, c: " + this.protocolVersion + " s: " + data.protocol );
      this.session.serverVersion = data.version;
      this.session.token = data.token;
      console.log( "Chat: Server version is " + this.session.serverVersion.join( "." ) );
      console.log( "Chat: Server token is " + this.session.token );
      this.sendAuth( "noora", "abcd1234" );
    };
    Chat.prototype.sendAuth = function( username, password )
    {
      if ( this.state != ChatState.connected )
        throw new ChatException( ChatExceptionCode.applicationError, "auth call out of state" );
      if ( !this.changeState( ChatState.authing ) )
        return;
      var sha1 = new Hashes.SHA1();
      var userHash = sha1.hex( username + password );
      var authHash = sha1.hex( userHash + this.session.token );
      this.socket.emit( "ngc_auth",
      {
        user: username,
        hash: authHash
      });
    };
    Chat.prototype.onAuth = function( data )
    {
      console.log( "iO: Packet NGC_Auth" );
      if ( this.state != ChatState.authing )
        throw new ChatException( ChatExceptionCode.protocolError, "ngc_auth out of state" );
      console.log( data );
    };
    Chat.prototype.onDisconnected = function()
    {
      if ( !this.changeState( ChatState.disconnected ) )
        return;
      console.log( "iO: Disconnected" );
    };
    Chat.prototype.onConnectFailed = function()
    {
      if ( !this.changeState( ChatState.disconnected ) )
        return;
      console.log( "iO: Connection failed" );
    };
    Chat.prototype.connect = function()
    {
      console.log( "Chat: Connecting to " + this.settings.endpoint );
      this.socket.socket.connect();
    };
    Chat.prototype.disconnect = function()
    {
      this.socket.socket.disconnect();
    };
    Chat.prototype.initialize = function()
    {
      console.log( "Chat: Initialize, version " + this.version.join( "." ) );
      this.connect();
    };
    function ChatModule()
    {
    }
    ChatModule.prototype.create = function( settings )
    {
      return new Chat( settings );
    };
    return new ChatModule();
  }
);
