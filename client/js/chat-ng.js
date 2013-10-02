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
//    foundation: "//cdnjs.cloudflare.com/ajax/libs/foundation/4.3.1/js/foundation.min"
    foundation: "foundation.min"
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
  App.GravatarImageComponent = Em.Component.extend({
    size: 200,
    email: '',
    gravatarUrl: function() {
      var email = this.get('email'), size = this.get('size');
      var hash = new hashes.MD5;
      return 'http://www.gravatar.com/avatar/' + hash.hex(email) + '?s=' + size;
    }.property('email', 'size')
  });
  App.Router.map(function(){});
  App.IndexRoute = Em.Route.extend({
    model: function() {
      return ["tomster@emberjs.com",""];
    }
  });
  require(
    ["domReady!","jquery","modernizr","foundation"],
    function( document, $, Modernizr, Foundation )
    {
      $( document ).foundation();
    }
  );
});
