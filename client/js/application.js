require.config(
{
  baseUrl: "js/lib",
  paths: {
    jquery: "//cdnjs.cloudflare.com/ajax/libs/jquery/2.0.3/jquery.min",
    handlebars: "handlebars-1.0.0", // "//cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.0.0/handlebars.min",
    ember: "ember-1.0.0", //cdnjs.cloudflare.com/ajax/libs/ember.js/1.0.0/ember.min",
    socketio: "socket.io", //"//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min",
    hashes: "hashes", // "hashes.min"
    modernizr: "modernizr.custom.81026", // "//cdnjs.cloudflare.com/ajax/libs/modernizr/2.6.2/modernizr.min",
    foundation: "foundation.min",
    ngchat: "ngchat",
    statemachine: "statemachine",
    marked: "//cdnjs.cloudflare.com/ajax/libs/marked/0.2.9/marked.min"
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
["domReady!","modernizr", "jquery","ember","foundation","ngchat","marked"],
function( document, Modernizr, $, Em, Foundation, Chat, marked )
{
  App = Em.Application.create(
  {
    rootElement: "#chat",
    LOG_TRANSITIONS: true,
    ready: function()
    {
      var canvas = document.createElement( "canvas" );
      canvas.width = 32;
      canvas.height = 32;
      this.set( "faviconCanvas", canvas );
      var clientClient = Chat.create(
      {
        endpoint: "http://chat.synkea.net:3000/"
      });
      this.set( "chat", clientClient );
      $( document ).foundation();
      clientClient.initialize( App, App.MemberListController, App.ChatBoxView );
      this.updateFavicon();
    }
  });

  App.updateFavicon = function()
  {
    var canvas = this.get( "faviconCanvas" );
    var ctx = canvas.getContext( "2d" );
    ctx.fillStyle = "#000000";
    ctx.fillRect( 0, 0, 32, 32 );
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText( "42", 0, 0 );
    $( "#favicon" ).attr( "href", canvas.toDataURL( "image/x-icon" ) );
  }; 

  App.LoginDialogController = Em.Controller.create(
  {
    loginClick: function()
    {
      if ( Modernizr.localstorage )
      {
        // Let's not save the password for now
        localStorage["ngc.account"] = this.get( "account" );
        //localStorage["ngc.password"] = this.get( "password" );
      }
      var cb = this.get( "callback" );
      cb[1].call( cb[0], true, this.get( "account" ), this.get( "password" ) );
    },
    cancelClick: function()
    {
      var cb = this.get( "callback" );
      if ( cb[1].call( cb[0], false, null, null ) )
        App.LoginDialogView.$().foundation( "reveal", "close" );
    }
  });

  App.LoginDialogView = Em.View.create(
  {
    tagName: "div",
    classNames: ["reveal-modal", "ngc-modal-login"],
    templateName: "login-dialog",
    controller: App.LoginDialogController
  });

  App.chatRequestAuth = function( context, callback )
  {
    App.LoginDialogView.$().bind( "opened", function()
    {
      Em.run(function()
      {
        if ( Modernizr.localstorage )
        {
          // Let's not save the password for now
          var u = localStorage["ngc.account"];
          App.LoginDialogController.set( "account", u ? u : "" );
          //var p = localStorage["ngc.password"];
          //App.LoginDialogController.set( "password", p ? p : "" );
        }
        App.LoginDialogView.$( "input:first" ).focus();
      });
    });
    App.LoginDialogView.$().foundation( "reveal", "open",
    {
      animation: "fade",
      animationSpeed: 30,
      closeOnBackgroundClick: false
    });
    App.LoginDialogController.set( "callback", [ context, callback ] );
  };

  App.chatAuthed = function()
  {
    App.LoginDialogView.$().foundation( "reveal", "close", { animationSpeed: 30 } );
  };

  App.chatDisconnected = function()
  {
    App.LoginDialogView.$().foundation( "reveal", "close", { animationSpeed: 30 } );
    App.MemberListController.clearMembers();
  };

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

  App.ApplicationView = Em.View.extend(
  {
    classNames: ["ngc-view-main"]
  });

  //-- Chat Box ---------------------------------------------------------------

  App.ChatBoxView = Em.ContainerView.create(
  {
    tagName: "ul",
    classNames: ["ngc-listbox", "ngc-chat"],
    addMessage: function( user, message )
    {
      var component = App.ChatMessageComponent.create({
        name: user.name,
        content: message
      });
      this.pushObject( component );
      component.rerender();
      var height = this.$()[0].scrollHeight;
      this.$().animate( { scrollTop: height }, 1000 );
    },
    addEvent: function( message )
    {
      var component = App.ChatEventComponent.create({
        content: message
      });
      this.pushObject( component );
      component.rerender();
      var height = this.$()[0].scrollHeight;
      this.$().animate( { scrollTop: height }, 1000 );
    },
    addData: function( data )
    {
      var component = App.ChatDataComponent.create({
        content: marked( data )
      });
      this.pushObject( component );
      component.rerender();
      var height = this.$()[0].scrollHeight;
      this.$().animate( { scrollTop: height }, 1000 );
    }
  });

  App.ChatMessageComponent = Em.Component.extend(
  {
    tagName: "li",
    classNames: ["ngc-chat-message"],
    templateName: "components/chat-message",
    name: "unknown",
    content: "unknown"
  });

  App.ChatEventComponent = Em.Component.extend(
  {
    tagName: "li",
    classNames: ["ngc-chat-message"],
    templateName: "components/chat-event",
    content: ""
  });

  App.ChatDataComponent = Em.Component.extend(
  {
    tagName: "li",
    classNames: ["ngc-chat-data"],
    templateName: "components/chat-data",
    content: ""
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
    clearMembers: function()
    {
      this.set( "content", [] );
    },
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
