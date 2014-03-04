require.config(
{
  baseUrl:        "js/lib",
  paths: {
    jquery:       "//cdnjs.cloudflare.com/ajax/libs/jquery/2.1.0/jquery.min",
    handlebars:   "//cdnjs.cloudflare.com/ajax/libs/handlebars.js/1.3.0/handlebars.min",
    ember:        "//cdnjs.cloudflare.com/ajax/libs/ember.js/1.4.0/ember.min",
    socketio:     "//cdnjs.cloudflare.com/ajax/libs/socket.io/0.9.16/socket.io.min",
    hashes:       "hashes.min",
    modernizr:    "modernizr.custom.81026",
    foundation:   "foundation.min",
    ngchat:       "ngchat",
    statemachine: "statemachine",
    domReady:     "//cdnjs.cloudflare.com/ajax/libs/require-domReady/2.0.1/domReady.min",
    text:         "//cdnjs.cloudflare.com/ajax/libs/require-text/2.0.10/text.min",
    json:         "json",
    baybay:       "baybay",
    rangy:        "rangyinputs-jquery",
    moment:       "//cdnjs.cloudflare.com/ajax/libs/moment.js/2.5.1/moment.min",
    i18n:         "i18n"
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
    },
    "i18n": {
      deps: ["ember"]
    }
  }
});

require(
["domReady!","modernizr","jquery","ember","foundation","ngchat","baybay","rangy","moment","i18n",
 "json!../../smileys/" + g_ngcSettings.smileySet + ".json",
 "json!../../localization/" + g_ngcSettings.localization + ".json"],
function( document, Modernizr, $, Em, Foundation, Chat, Baybay, Rangy, moment, i18n, smileySet, localeSet )
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

  Em.I18n.translations = localeSet.localization;

  App = Em.Application.create(
  {
    rootElement: "#chat",
    LOG_TRANSITIONS: true,
    ready: function()
    {
      var bbcode = new Baybay();
      this.set( "bbcode", bbcode );
      var clientClient = Chat.create(
      {
        endpoint: g_ngcSettings.endPoint
      });
      this.set( "chat", clientClient );
      $( document ).foundation();
      clientClient.initialize( App, App.MemberListController, App.ChatBoxView );
      if ( g_ngcSettings.autoConnect )
        clientClient.connect();
    }
  });

  App.LoginDialogController = Em.Controller.create(
  {
    loginClick: function()
    {
      if ( Modernizr.localstorage )
      {
        localStorage["ngc.account"] = this.get( "account" );
        localStorage["ngc.password"] = this.get( "password" );
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
          var u = localStorage["ngc.account"];
          App.LoginDialogController.set( "account", u ? u : "" );
          var p = localStorage["ngc.password"];
          App.LoginDialogController.set( "password", p ? p : "" );
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
      controller.set( "title", g_ngcSettings.title );

      var chat = App.get( "chat" );      

      var cb = function( state ) 
      {
        controller.set( "status", chat.ChatStateName[state] );
        if (state >= chat.ChatState.idle) 
        {
          controller.set( "authenticated", true );
        } 
        else 
        {
          controller.set( "authenticated", false );
        }
      };

      chat.onEnterStateEmber = cb;
    }
  });

  App.ApplicationController = Em.Controller.extend(
  {
    status: "Loading...",
    authenticated: false,
    
    actions: {
      connect: function() {
        App.get( "chat" ).connect();
      },
      disconnect: function() {
        App.get( "chat" ).disconnect();
      }
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
        Em.run.next( this, function()
        {
          var cmdline = this.get( "commandLine" );

          try {
            var bbcode = App.get( "bbcode" );
            bbcode.parse( cmdline );
          } catch ( e ) {
            alert( "Your message contains erroneus BBCode: " + e.message );
            return;
          }

          var chat = App.get( "chat" );
          chat.execute( cmdline );
          this.set( "commandLine", "" );
        });
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
        var smile = { id: i, file: "smileys/" + g_ngcSettings.smileySet + "/" + data.smileys[i].file, name: data.smileys[i].tags[0] };
        this.pushObject( smile );
      }
    }
  });

  //-- Chat Box ---------------------------------------------------------------

  App.ChatBoxView = Em.ContainerView.create(
  {
    tagName: "ul",
    classNames: ["ngc-listbox", "ngc-chat"],
    doScroll: function()
    {
      Em.run(function()
      {
        var inner = function()
        {
          this.$().clearQueue().animate( { scrollTop: this.$()[0].scrollHeight * 2 }, 250 );
        };
        Em.run.scheduleOnce( "afterRender", App.ChatBoxView, inner );
      });
    },
    addMessage: function( timestamp, user, message )
    {
      var component = App.ChatMessageComponent.create({
        name: user.name,
        content: message,
        "timestamp": timestamp.format( "HH:mm:ss" )
      });
      this.pushObject( component );
      this.doScroll();
    },
    addWhisper: function( timestamp, user, target, message ) 
    {
      var component = App.ChatWhisperComponent.create({
        sender: user.name,
        receiver: target.name,
        content: message,
        "timestamp": timestamp.format( "HH:mm:ss" )
      });
      this.pushObject( component );
      this.doScroll();
    },
    addEvent: function( timestamp, message )
    {
      var component = App.ChatEventComponent.create({
        content: message,
        "timestamp": timestamp.format( "HH:mm:ss" )
      });
      this.pushObject( component );
      this.doScroll();
    }
  });

  App.parseContent = function( content ) 
  {
    var data = App.get( "smileys" );
    var bbcode = App.get( "bbcode" );
    var parsed = escapeHTML( content );

    // smiley parsing
    for ( var i = 0; i < data.smileys.length; i++ )
    {
      for ( var j = 0; j < data.smileys[i].tags.length; j++ )
      {
        var elem = "<img class=\"emote\" src=\"smileys/" + g_ngcSettings.smileySet + "/" + data.smileys[i].file + "\" alt=\"" + data.smileys[i].tags[j] + "\">";
        parsed = parsed.split( data.smileys[i].tags[j] ).join( elem );
      }
    }

    // bbcode parsing
    try {
      parsed = bbcode.parse( parsed );
    } catch ( e ) {
      console.log( "Chat: BBCode parse error in App.parseContent:" );
      console.log( e );
    }
    
    // remove action prefixes if any
    if ( parsed.indexOf( "/me " ) === 0 )
    {
      parsed = parsed.substring( 4 );
    }	
    else if ( parsed.indexOf( "/action " ) === 0 ) 
    {
      parsed = parsed.substring( 8 );
    }

    // link parsing
    words = parsed.split( " " );
    for ( var k = 0; k < words.length; k++ )
    {
      var word = words[k];
      var url_word = word;
      if ( word.indexOf( "www." ) === 0 ) {
        url_word = "http://" + word;
      }
      if ( url_word.indexOf( "http://" ) === 0
        || url_word.indexOf( "https://" ) === 0 )
      {
        var a = $( "<a></a>" );
        a.attr( "href", url_word );
        a.attr( "target", "_blank" );
        a.text( word );
        var b = $( "<span></span>" );
        b.append( a );
        words[k] = b.html();
      }
    }
    
    parsed = words.join( " " );
    
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
    content: "",
    timestamp: "unknown"
  });

  //-- Member List ------------------------------------------------------------

  App.Member = Em.Object.extend(Em.I18n.TranslateableProperties,
  {
    id: null,
    name: null,
    hasAvatar: false,
    level: 0,
    statusTranslation: "user.classRegular"
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
        return "theme/" + g_ngcSettings.smileySet + "/no_avatar.gif";
      return g_ngcSettings.endPoint + "avatar/" + this.get( "id" );
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
      var statusStrings = [
        "user.classRegular",
        "user.classModerator",
        "user.classAdministrator"
      ];
      var component = App.Member.create(
      {
        id: user.id,
        name: user.name,
        hasAvatar: user.avatar,
        level: user.level,
        statusTranslation: statusStrings[user.level]
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
