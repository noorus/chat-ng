define(
  ["socketio","hashes","statemachine","moment"],
  function( sIO, Hashes, StateMachine, moment )
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
      idle: 4,
      who: 5,
      backlog: 6
    };
    var ChatStateName =
    [
      "Disconnected",
      "Connecting",
      "Handshaking",
      "Authenticating",
      "Logged In",
      "Getting Members",
      "Catching Up"
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
      var that = this;
      this.ChatState = ChatState;
      this.ChatStateName = ChatStateName;
      this.sm = StateMachine.create();
      this.sm.onEnterState = function( state ) { that.onEnterState( state ) };
      this.sm.onLeaveState = this.onLeaveState;
      this.sm.changeState( ChatState.disconnected );
      this.application = null;
      this.memberList = null;
      this.chatBox = null;
      this.settings = settings;
      this.version = [0, 0, 1];
      this.protocolVersion = 0;
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
      this.socket.on( "ngc_whisper",      function( data ){ this._owner.onWhisper.call( this._owner, data ); } );
      this.socket.on( "ngc_close",        function( data ){ this._owner.onClose.call( this._owner, data ); } );
    }
    Chat.prototype.onEnterState = function( state )
    {
      console.log( "Chat: Entering state " + ChatStateName[state] );
      this.onEnterStateEmber( state );
    };
    Chat.prototype.onEnterStateEmber = function( state )
    {
      // stubb for ember's replacement
    };
    Chat.prototype.onLeaveState = function( state )
    {
      console.log( "Chat: Leaving state " + ChatStateName[state] );
    };
    Chat.prototype.onError = function( error )
    {
      console.log( "iO: Error!" );
      console.log( error );
      if ( this.sm.getState() == ChatState.disconnected )
      {
        console.log( "Server down or transport unavailable!" );
      }
    };
    Chat.prototype.onConnecting = function()
    {
      if ( !this.sm.changeState( ChatState.connecting ) )
        return;
      console.log( "iO: Connecting" );
      this.chatBox.addEvent( moment(), "Connecting..." );
    };
    Chat.prototype.onConnected = function()
    {
      if ( !this.sm.changeState( ChatState.connected ) )
        return;
      console.log( "iO: Connected" );
      this.chatBox.addEvent( moment(), "Connected" );
    };
    Chat.prototype.onWelcome = function( data )
    {
      console.log( "iO: Packet NGC_Welcome" );
      if ( this.sm.getState() != ChatState.connected )
        throw new ChatException( ChatExceptionCode.protocolError, "NGC_Welcome out of state" );
      if ( this.protocolVersion != data.protocol )
        throw new ChatException( ChatExceptionCode.protocolError,
          "Protocol version mismatch, c: " + this.protocolVersion + " s: " + data.protocol );
      this.session.serverVersion = data.version;
      this.session.token = data.token;
      console.log( "Chat: Server version is " + this.session.serverVersion.join( "." ) );
      console.log( "Chat: Server token is " + this.session.token );
      this.application.chatRequestAuth( this, this.doAuth );
    };
    Chat.prototype.doAuth = function( _do, username, password )
    {
      if ( !_do ) {
        this.disconnect();
        return true;
      }
      if ( this.sm.getState() != ChatState.connected )
        throw new ChatException( ChatExceptionCode.applicationError, "Auth call out of state" );
      if ( !this.sm.changeState( ChatState.authing ) )
        return false;
      if (typeof password === "undefined") {
        password = ""; 
      }
      var sha1 = new Hashes.SHA1();
      var userHash = sha1.hex( username.toLowerCase() + password );
      var authHash = sha1.hex( userHash + this.session.token );
      this.socket.emit( "ngc_auth",
      {
        user: username,
        hash: authHash
      });
      return true;
    };
    Chat.prototype.onAuth = function( data )
    {
      console.log( "iO: Packet NGC_Auth" );
      if ( this.sm.getState() != ChatState.authing )
        throw new ChatException( ChatExceptionCode.protocolError, "NGC_Auth out of state" );
      if ( data.code != 0 ) {
        switch ( data.code ) {
          case 1: alert( "Tietokantavirhe" ); break;
          case 2: alert( "Tuntematon käyttäjätunnus" ); break;
          case 3: alert( "Virheellinen salasana" ); break;
        }
        this.sm.changeState( ChatState.connected );
        this.application.chatRequestAuth( this, this.doAuth );
      } else {
        this.sm.changeState( ChatState.idle );
        this.sm.pushState( ChatState.who );
        this.sm.pushState( ChatState.backlog );
        this.application.chatAuthed();
      }
    };
    Chat.prototype.execute = function( commandLine )
    {
      if ( commandLine ) // String.trim does not exist in IE8
        commandLine = commandLine.replace( /^\s+|\s+$/g, "" );
      if ( this.sm.getState() != ChatState.idle || !commandLine || !commandLine.length )
        return;
      if ( commandLine.indexOf( "/msg" ) == 0 )
      {
        var parts = commandLine.split( " " );
        if ( parts.length < 3 )
          return;
        parts.shift(); // "/msg"
        var target = parts.shift();
        var message = parts.join( " " );
        this.socket.emit( "ngc_whisper", {
          target: target,
          msg: message
        });
        return;
      }
      this.socket.emit( "ngc_msg", {
        msg: commandLine
      });
    };
    Chat.prototype.onWho = function( data )
    {
      console.log( "iO: Packet NGC_Who" );
      if ( this.sm.getState() == ChatState.backlog ) 
      {
        this.sm.popState();
      }
      if ( this.sm.getState() != ChatState.who )
      {
        throw new ChatException( ChatExceptionCode.protocolError, "NGC_Who out of state" );
      }
      this.memberList.clearMembers();
      for ( var i = 0; i < data.users.length; i++ ) 
      {
        this.memberList.addMember( data.users[i] );
      }
      this.sm.popState();
    };
    Chat.prototype.onMsg = function( data )
    {
      console.log( "iO: Packet NGC_Msg" );
      var timestamp = moment( data.timestamp );
      this.chatBox.addMessage( timestamp, data.user, data.message );
    };
    Chat.prototype.onWhisper = function( data ) 
    {
      console.log( "iO: Packet NGC_Whisper" );
      var timestamp = moment( data.timestamp );
      this.chatBox.addWhisper( timestamp, data.user, data.target, data.message );
    };

    Chat.prototype.onClose = function( data )
    {
      console.log( "iO: Packet NGC_Close" );
      this.chatBox.addEvent( moment(), "Connection closed by server: " + data.message );
    };
    Chat.prototype.onJoin = function( data )
    {
      console.log( "iO: Packet NGC_Join" );
      if ( this.sm.getState() != ChatState.backlog ) 
      {
        this.memberList.addMember( data.user );
      }
      var timestamp = moment( data.timestamp );
      this.chatBox.addEvent( timestamp, data.user.name + " joined the chat" );
    };
    Chat.prototype.onLeave = function( data )
    {
      console.log( "iO: Packet NGC_Leave" );
      if ( this.sm.getState() != ChatState.backlog ) 
      {
        this.memberList.removeMember( data.user );
      }
      var timestamp = moment( data.timestamp );
      this.chatBox.addEvent( timestamp, data.user.name + " left the chat" );
    };
    Chat.prototype.onDisconnected = function()
    {
      if ( !this.sm.changeState( ChatState.disconnected ) )
        return;
      console.log( "iO: Disconnected" );
      this.chatBox.addEvent( moment(), "Disconnected" );
      this.application.chatDisconnected();
    };
    Chat.prototype.onConnectFailed = function()
    {
      if ( !this.sm.changeState( ChatState.disconnected ) )
        return;
      console.log( "iO: Connection failed" );
      this.chatBox.addEvent( moment(), "Connectiong failed" );
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
    Chat.prototype.initialize = function( application, memberList, chatBox )
    {
      console.log( "Chat: Initialize, version " + this.version.join( "." ) );
      this.application = application;
      this.memberList = memberList;
      this.chatBox = chatBox;
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
