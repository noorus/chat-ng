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
    ngchat: "ngchat",
    statemachine: "statemachine"
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
      var chat = App.get( "chat" );
      chat.execute( this.get( "commandLine" ) );
      this.set( "commandLine", "" );
    }
  });

  App.MessageListView = Em.ContainerView.create(
  {
    tagName: "ul",
    classNames: ["ngc-listbox", "ngc-chat"],
    addMessage: function( user, message )
    {
      var childViews = this.get( "childViews" );
      var component = App.ChatMessageComponent.create({
        name: user.name,
        content: message
      });
      childViews.pushObject( component );
      component.rerender();
    }
  });

  App.ChatMember = Em.Object.extend({
    id: null,
    name: null
  });

  App.MemberListController = Em.ArrayController.create(
  {
    content: [],
    sortProperties: ["name"],
    sortAscending: true,
    addMember: function( user )
    {
      var component = App.ChatMember.create({
        id: user.id,
        name: user.name,
        click: function(){ alert("click!"); }
      });
      this.pushObject( component );
    },
    removeMember: function( user )
    {
      this.forEach( function( item, index, enumerable )
      {
        if ( item.get( "id" ) == user.id )
          this.removeObject( item );
      });
    }
  });

  require(
    ["domReady!","jquery","modernizr","foundation","ngchat"],
    function( document, $, Modernizr, Foundation, Chat )
    {
      var c = Chat.create({
        endpoint: "http://chat.synkea.net:3000/"
      });
      App.set( "chat", c );
      $( document ).foundation();
      App.MessageListView.appendTo( "#messageList" );
      c.initialize( App.MemberListController, App.MessageListView );
    }
  );
});
