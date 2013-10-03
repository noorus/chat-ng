/*      var host = "http://synkea.net:3000/chat";
      var options = { "auto connect": false };
      var socket = io.connect( host, options );
      socket.on( "connect", function(){ console.log( "iO: Connected" ); } );
      socket.on( "connecting", function(){ console.log( "iO: Connecting" ); } );
      socket.on( "disconnect", function(){ console.log( "iO: Disconnected" ); } );
      socket.on( "connect_failed", function(e){ console.log( "iO: Connection failed" ); } );
      socket.on( "error", function(e){ console.log( "iO: Error!" ); } );
      socket.on( "message", function(msg,cb){ console.log( "iO: Message" ); console.log( msg ); } );
      socket.on( "test", function(msg){ console.log( "iO: Test" ); console.log( msg ); } );
      socket.on( "reconnect", function(){ console.log( "iO: Reconnected" ); } );
      socket.on( "reconnecting", function(){ console.log( "iO: Reconnecting" ); } );
      socket.on( "reconnect_failed", function(){ console.log( "iO: Reconnection failed" ); } );
      socket.socket.connect();
*/
define(
  ["socketio"],
  function( sIO )
  {
    function Chat( settings )
    {
      this.socketOptions = {
        "auto connect": false
      };
      this.socket = sIO.connect( settings.endpoint, this.socketOptions );
      this.socket.on( "connecting", this.onConnecting );
      this.socket.on( "connect", this.onConnected );
      this.socket.on( "disconnect", this.onDisconnected );
      this.socket.on( "reconnecting", this.onConnecting );
      this.socket.on( "reconnect", this.onConnected );
      this.socket.on( "ngc_welcome", function(data){ console.log(data); } );
    }
    Chat.prototype.onConnecting = function()
    {
      console.log( "iO: Connecting" );
    };
    Chat.prototype.onConnected = function()
    {
      console.log( "iO: Connected" );
    };
    Chat.prototype.onDisconnected = function()
    {
      console.log( "iO: Disconnected" );
    };
    Chat.prototype.initialize = function()
    {
      console.log( "Chat: Initialize" );
      this.socket.socket.connect();
    };
    function ChatModule()
    {
      this.version = "0.0.1";
    }
    ChatModule.prototype.create = function( settings )
    {
      return new Chat( settings );
    };
    return new ChatModule();
  }
);
