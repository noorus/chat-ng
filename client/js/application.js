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
["jquery","ember","foundation","ngchat"],
function( $, Em, Foundation, Chat )
{
  App = Em.Application.create(
  {
    rootElement: "#chat",
    LOG_TRANSITIONS: true,
    ready: function()
    {
      var clientClient = Chat.create(
      {
        endpoint: "http://chat.synkea.net:3000/"
      });
      this.set( "chat", clientClient );
      require( ["domReady!"], function( document )
      {
        $( document ).foundation();
      });
      clientClient.initialize( App.MemberListController, App.ChatBoxView );
    }
  });

  App.Router.map(function(){});

  App.ApplicationRoute = Em.Route.extend(
  {
    setupController: function( controller )
    {
      controller.set( "title", "Tsättihomman otsikko" );
    }
  });

  App.IndexRoute = Em.Route.extend(
  {
    setupController: function( controller )
    {
      controller.set( "title", "Keskustelun aihe (topic?)" );
    }
  });

  App.IndexController = Em.Controller.extend(
  {
    commandLine: "",
    execute: function() {
      var chat = App.get( "chat" );
      chat.execute( this.get( "commandLine" ) );
      this.set( "commandLine", "" );
    }
  });

  //-- Chat Box ---------------------------------------------------------------

  App.ChatBoxView = Em.ContainerView.create(
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
      var height = this.$()[0].scrollHeight;
      this.$().animate({scrollTop: height}, 1000);
    },
    addEvent: function( message )
    {
      var childViews = this.get( "childViews" );
      var component = App.ChatEventComponent.create({
        content: message
      });
      childViews.pushObject( component );
      component.rerender();
      var height = this.$()[0].scrollHeight;
      this.$().animate({scrollTop: height}, 400);
    }
  });

  App.ChatEventComponent = Em.Component.extend(
  {
    tagName: "li",
    classNames: ["ngc-chat-message"],
    templateName: "components/chat-event",
    content: ""
  });

  App.ChatMessageComponent = Em.Component.extend(
  {
    tagName: "li",
    classNames: ["ngc-chat-message"],
    templateName: "components/chat-message",
    name: "unknown",
    content: "unknown"
  });

  //-- Member List ------------------------------------------------------------

  App.Member = Em.Object.extend(
  {
    id: null,
    name: null,
    hasAvatar: false
  });

  App.MemberView = Em.View.extend(
  {
    tagName: "li",
    classNames: ["ngc-members-member"],
    templateName: "member",
    click: function( event )
    {
      this.get( "controller" ).send( "memberClick" );
    }
  });

  App.MemberController = Em.ObjectController.extend(
  {
    avatar: function()
    {
      if ( !this.get( "hasAvatar" ) )
        return "http://placehold.it/30x30";
      return "http://chat.synkea.net:3000/avatar/" + this.get( "id" );
    }.property( "id" ),
    actions:
    {
      memberClick: function()
      {
        alert( "Clicked member " + this.get( "id" ) );
      }
    }
  });

  App.MemberListController = Em.ArrayController.create(
  {
    content: [],
    sortProperties: ["name"],
    sortAscending: true,
    addMember: function( user )
    {
      var component = App.Member.create(
      {
        id: user.id,
        name: user.name,
        hasAvatar: user.avatar
      });
      this.pushObject( component );
    },
    removeMember: function( user )
    {
      this.forEach( function( item, index, enumerable )
      {
        if ( item && item.get( "id" ) == user.id )
        {
          enumerable.removeObject( item );
          return;
        }
      });
    }
  });
});
