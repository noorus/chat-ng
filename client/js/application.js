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
    text: "text",
    json: "json",
    baybay: "baybay",
    rangy: "rangyinputs-jquery"
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
    },
    "rangy": {
      deps: ["jquery"]
    }
  }
});

require(
["domReady!","modernizr","jquery","ember","foundation","ngchat","baybay","rangy","json!../../smileys/default.json"],
function( document, Modernizr, $, Em, Foundation, Chat, Baybay, Rangy, smileySet )
{
  function escapeHTML( string )
  {
    /* Limited escaping
    var htmlEscapes = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    var htmlEscaper = /[&<>"'\/]/g;*/

    var htmlEscapes = {
      '<': '&lt;',
      '>': '&gt;'
    };
    var htmlEscaper = /[<>]/g;

    return ( '' + string ).replace( htmlEscaper, function( match ){ return htmlEscapes[match]; } );
  };

  App = Em.Application.create(
  {
    rootElement: "#chat",
    LOG_TRANSITIONS: true,
    ready: function()
    {
      var bbcode = new Baybay();
      this.set( "bbcode", bbcode );
      Em.run(function()
      {
        var canvas = document.createElement( "canvas" );
        canvas.width = 32;
        canvas.height = 32;
        App.set( "faviconCanvas", canvas );
        var base = new Image();
        base.src = $( "#favicon" ).attr( "href" );
        base.onload = function(){
          App.set( "faviconBase", base );
          App.updateFavicon();
        };
      });
      var clientClient = Chat.create(
      {
        endpoint: "http://chat.synkea.net:3000/"
      });
      this.set( "chat", clientClient );
      $( document ).foundation();
      clientClient.initialize( App, App.MemberListController, App.ChatBoxView );
    }
  });

  App.updateFavicon = function()
  {
    var canvas = this.get( "faviconCanvas" );
    var base = this.get( "faviconBase" );
    var ctx = canvas.getContext( "2d" );
    ctx.drawImage( base, 0, 0 );
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.font = "bold 18px sans-serif";
    ctx.fillText( "5!", 8, 4 );
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
        // localStorage["ngc.password"] = this.get( "password" );
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
          // var p = localStorage["ngc.password"];
          // App.LoginDialogController.set( "password", p ? p : "" );
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
      controller.set( "title", "Title" );
    }
  });

  App.ApplicationView = Em.View.extend(
  {
    classNames: ["ngc-view-main"]
  });

  App.IndexRoute = Em.Route.extend(
  {
    setupController: function( controller )
    {
      controller.set( "title", "Topic" );
    }
  });

  App.IndexController = Em.Controller.extend(
  {
    commandLine: "",
    insertSmiley: function( smiley )
    {
      Em.run(function()
      {
        $( "input[name='commandLine']" ).focus().surroundSelectedText( " " + smiley, "", "collapsetostart" );
      });
    },
    insertBBCode: function( before, after )
    {
      Em.run(function()
      {
        $( "input[name='commandLine']" ).focus().surroundSelectedText( before, after );
      });
    },
    actions:
    {
      execute: function()
      {
        var chat = App.get( "chat" );
        chat.execute( this.get( "commandLine" ) );
        this.set( "commandLine", "" );
      },
      smileyClicked: function( id )
      {
        var data = App.get( "smileys" );
        this.insertSmiley( data.smileys[id].tags[0] );
      },
      bbcodeClicked: function( code )
      {
        switch ( code )
        {
          case "bold":
            this.insertBBCode( "[b]", "[/b]" );
          break;
          case "italic":
            this.insertBBCode( "[i]", "[/i]" );
          break;
          case "underline":
            this.insertBBCode( "[u]", "[/u]" );
          break;
        }
      }
    }
  });

  /*App.IndexView = Em.View.extend(
  {
    didInsertElement: function()
    {
      Em.run.scheduleOnce( "afterRender", this, "initFoundation" );
    },
    initFoundation: function()
    {
      //console.log( "Initing Foundation forms" );
      //$( document ).foundation( "forms" );
    }
  });*/

  //-- Chat Tools -------------------------------------------------------------

  App.ChatTargetSelect = Em.Select.extend({ classNames: ["prefix"] });

  App.ChatTargetController = Em.ArrayController.create(
  {
    content: [
      { id: 0, name: "Public" }
    ],
    target: null
  });

  App.ChatSmileysController = Em.ArrayController.create(
  {
    content: [],
    init: function()
    {
      // This does not belong here, but I just don't know where else to do it -
      // App constructor can't set things, and App init is called too late
      App.set( "smileys", smileySet );
      var data = App.get( "smileys" );
      for ( var i = 0; i < data.smileys.length; i++ )
      {
        if ( !data.smileys[i].public )
          continue;
        var smile = { id: i, file: "smileys/default/" + data.smileys[i].file, name: data.smileys[i].tags[0] };
        this.pushObject( smile );
      }
    }
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
      var height = this.$()[0].scrollHeight;
      this.$().animate( { scrollTop: height }, 1000 );
    },
    addWhisper: function( user, target, message ) 
    {
      var component = App.ChatWhisperComponent.create({
        sender: user.name,
        receiver: target.name,
        content: message
      });
      this.pushObject( component );
      var height = this.$()[0].scrollHeight;
      this.$().animate( { scrollTop: height}, 1000 );
    },
    addEvent: function( message )
    {
      var component = App.ChatEventComponent.create({
        content: message
      });
      this.pushObject( component );
      var height = this.$()[0].scrollHeight;
      this.$().animate( { scrollTop: height }, 1000 );
    },
    addData: function( data )
    {
      var component = App.ChatDataComponent.create({
        content: marked( data )
      });
      this.pushObject( component );
      var height = this.$()[0].scrollHeight;
      this.$().animate( { scrollTop: height }, 1000 );
    }
  });

  App.parseContent = function( content ) 
  {
    // TODO: Make sure Baybay doesn't throw, or catch it and show unparsed content instead
    var data = App.get( "smileys" );
    var bbcode = App.get( "bbcode" );
    var parsed = escapeHTML( content );
    for ( var i = 0; i < data.smileys.length; i++ )
    {
      for ( var j = 0; j < data.smileys[i].tags.length; j++ )
      {
        var elem = "<img class=\"emote\" src=\"smileys/default/" + data.smileys[i].file + "\" alt=\"" + data.smileys[i].tags[j] + "\">";
        parsed = parsed.split( data.smileys[i].tags[j] ).join( elem );
      }
    }
    parsed = bbcode.parse( parsed );
    
    if ( parsed.indexOf( "/me" ) === 0 )
    {
      parsed = parsed.substring(3);
    }	
    else if ( parsed.indexOf( "/action" ) === 0 ) 
    {
      parsed = parsed.substring(7);
    }
    
    return parsed;
  };

  App.checkAction = function( content )
  {
    return ( content.indexOf( "/me" ) === 0 
      || content.indexOf( "/action" ) === 0 );
  };

  App.ChatMessageComponent = Em.Component.extend(
  {
    tagName: "li",
    classNames: ["ngc-chat-message"],
    templateName: "components/chat-message",
    name: "unknown",
    content: "unknown",
    timestamp: "unknown",
    isAction: function() { return App.checkAction( this.get( "content" ) ) }.property( "content" ),
    classNameBindings: ["isAction"],
    contentParsed: function(){ return App.parseContent( this.get( "content" ) ) }.property( "content" )
  });

  App.ChatWhisperComponent = Em.Component.extend(
  {
    tagName: "li",
    classNames: ["ngc-chat-whisper"],
    templateName: "components/chat-whisper",
    sender: "unknown",
    content: "unknown",
    receiver: "unknown",
    timestamp: "unknown",
    isAction: function() { return App.checkAction( this.get( "content" ) ) }.property( "content" ),
    classNameBindings: ["isAction"],
    contentParsed: function(){ return App.parseContent( this.get( "content" ) ) }.property( "content" )
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
        return "theme/default/no_avatar.gif";
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
