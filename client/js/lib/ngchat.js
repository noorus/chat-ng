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
      this.memberList = null;
      this.messageList = null;
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
      this.socket.on( "ngc_who",          function( data ){ this._owner.onWho.call( this._owner, data ); } );
      this.socket.on( "ngc_join",         function( data ){ this._owner.onJoin.call( this._owner, data ); } );
      this.socket.on( "ngc_leave",        function( data ){ this._owner.onLeave.call( this._owner, data ); } );
      this.socket.on( "ngc_msg",          function( data ){ this._owner.onMsg.call( this._owner, data ); } );
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
        throw new ChatException( ChatExceptionCode.protocolError, "NGC_Welcome out of state" );
      if ( this.protocolVersion != data.protocol )
        throw new ChatException( ChatExceptionCode.protocolError,
          "Protocol version mismatch, c: " + this.protocolVersion + " s: " + data.protocol );
      this.session.serverVersion = data.version;
      this.session.token = data.token;
      console.log( "Chat: Server version is " + this.session.serverVersion.join( "." ) );
      console.log( "Chat: Server token is " + this.session.token );
      var u = prompt( "Käyttäjätunnus" );
      var p = prompt( "Salasana" );
      this.sendAuth( u, p );
    };
    Chat.prototype.sendAuth = function( username, password )
    {
      if ( this.state != ChatState.connected )
        throw new ChatException( ChatExceptionCode.applicationError, "Auth call out of state" );
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
        throw new ChatException( ChatExceptionCode.protocolError, "NGC_Auth out of state" );
      if ( data.code != 0 ) {
        switch ( data.code ) {
          case 1: alert( "Tietokantavirhe" ); break;
          case 2: alert( "Tuntematon käyttäjätunnus" ); break;
          case 3: alert( "Virheellinen salasana" ); break;
        }
        this.changeState( ChatState.connected );
        var u = prompt( "Käyttäjätunnus" );
        var p = prompt( "Salasana" );
        this.sendAuth( u, p );
      } else {
        this.changeState( ChatState.idle );
        this.memberList.addMember( data.user );
      }
    };
    Chat.prototype.execute = function( commandLine )
    {
      if ( !commandLine || !commandLine.length )
        return;
      if ( this.state != ChatState.idle )
        return;
      this.socket.emit( "ngc_msg",{
        msg: commandLine
      });
    };
    Chat.prototype.onWho = function( data )
    {
      console.log( "iO: Packet NGC_Who" );
      if ( this.state != ChatState.idle )
        throw new ChatException( ChatExceptionCode.protocolError, "NGC_Who out of state" );
      for ( var i = 0; i < data.users.length; i++ )
        this.memberList.addMember( data.users[i] );
    };
    Chat.prototype.onMsg = function( data )
    {
      console.log( "iO: Packet NGC_Msg" );
      this.messageList.addMessage( data.user, data.message );
    };
    Chat.prototype.onJoin = function( data )
    {
      console.log( "iO: Packet NGC_Join" );
      this.memberList.addMember( data.user );
    };
    Chat.prototype.onLeave = function( data )
    {
      console.log( "iO: Packet NGC_Leave" );
      this.memberList.removeMember( data.user );
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
    Chat.prototype.initialize = function( memberList, messageList )
    {
      console.log( "Chat: Initialize, version " + this.version.join( "." ) );
      this.memberList = memberList;
      this.messageList = messageList;
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
