require.config(
{
  baseUrl: "js/lib",
  paths: {
    jquery: "//cdnjs.cloudflare.com/ajax/libs/jquery/2.0.3/jquery.min",
    handlebars: "//cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.0.0/handlebars.min",
    ember: "//cdnjs.cloudflare.com/ajax/libs/ember.js/1.0.0/ember.min",
    socketio: "//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min",
    hashes: "hashes.min",
    modernizr: "//cdnjs.cloudflare.com/ajax/libs/modernizr/2.6.2/modernizr.min",
    foundation: "foundation.min",
    ngchat: "ngchat"
  },
  shim: {
    "ember": {
      exports: "Ember",
      deps: ["jquery","handlebars"]
    },
    "socketio": {
      exports: "io"
    },
    "modernizr": {
      exports: "Modernizr"
    },
    "foundation": {
      exports: "Foundation",
      deps: ["jquery","modernizr"]
    }
  }
});

require(
["jquery","ember","socketio","hashes","modernizr","foundation"],
function( $, Em, io, hashes, Modernizr, Foundation )
{
  App = Em.Application.create({
    rootElement: "#chat",
    LOG_TRANSITIONS: true
  });

  App.ChatMessageComponent = Em.Component.extend({
    tagName: "li",
    classNames: ["ngc-chat-message"],
    templateName: "components/chat-message",
    name: "unknown",
    content: "unknown"
  });

  App.ChatMemberComponent = Em.Component.extend({
    tagName: "li",
    classNames: ["ngc-members-member"],
    templateName: "components/chat-member",
    name: "unknown",
    click: function(){ console.log( "click" ); }
  });

  App.Router.map(function(){});
  App.ApplicationRoute = Em.Route.extend({
    setupController: function( controller )
    {
      controller.set( "title", "Tsättihomman otsikko" );
    }
  });
  App.IndexRoute = Em.Route.extend({
    setupController: function( controller )
    {
      controller.set( "title", "Keskustelun aihe (topic?)" );
    }
  });
  App.IndexController = Em.Controller.extend({
    commandLine: "",
    execute: function() {
      var line = App.ChatMessageComponent.create({
        name: "Nimi",
        content: this.get( "commandLine" )
      });
      line.appendTo( ".ngc-chat" );
      line.rerender();
      this.set( "commandLine", "" );
    }
  });
  require(
    ["domReady!","jquery","modernizr","foundation","ngchat"],
    function( document, $, Modernizr, Foundation, Chat )
    {
      var c = Chat.create({
        endpoint: "http://chat.synkea.net:3000/chat"
      });
      $( document ).foundation();
      for ( i = 0; i < 5; i++ )
      {
        var member = App.ChatMemberComponent.create({
          name: "Käyttäjä " + i
        });
        member.appendTo( ".ngc-members" );
        member.rerender();
      }
      c.initialize();
    }
  );
});
