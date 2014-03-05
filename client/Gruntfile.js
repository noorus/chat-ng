module.exports = function( grunt )
{
  grunt.initConfig(
  {
    pkg: grunt.file.readJSON( "package.json" ),
    ngc_localizations: [],
    ngc_smileysets: [],
    prompt: {
      dist: {
        options: {
          questions: [
            {
              config: "preprocess.options.context.title",
              type: "input",
              message: "What is the title of your chat instance?",
              default: "Chat-NG"
            },
            {
              config: "preprocess.options.context.endpoint",
              type: "input",
              message: "What is the endpoint of your chat instance?",
              default: "http://localhost:3000/"
            },
            {
              config: "preprocess.options.context.theme",
              type: "list",
              message: "Which theme do you want to use?",
              choices: [
                { name: "default" }
              ],
              default: "default"
            },
            {
              config: "preprocess.options.context.smileyset",
              type: "list",
              message: "Which smiley set do you want to use?",
              choices: function(){ return grunt.config.getRaw( "ngc_smileysets" ); },
              default: "default"
            },
            {
              config: "preprocess.options.context.language",
              type: "list",
              message: "Which localization do you want to use?",
              choices: function(){ return grunt.config.getRaw( "ngc_localizations" ); },
              default: "en"
            }
          ]
        }
      }
    },
    compass: {
      dist: {
      options: {
        require: "zurb-foundation",
        environment: "production",
        app: "stand_alone",
        cssDir: "theme",
        sassDir: "sass",
        imagesDir: "img",
        javascriptsDir: "js/lib",
        outputStyle: "compressed",
        relativeAssets: true,
        noLineComments: true
      }
      }
    },
    preprocess: {
      options: {
        context: {
          autoconnect: "true"
        }
      },
      dist: {
        src: "index.template.html",
        dest: "index.html"
      }
    }
  });
  grunt.loadNpmTasks( "grunt-prompt" );
  grunt.loadNpmTasks( "grunt-contrib-compass" );
  grunt.loadNpmTasks( "grunt-preprocess" );
  grunt.registerTask( "loadlocalizations", "Load internal list of localizations.", function()
  {
    var fs = require( "fs" );
    var dir = fs.readdirSync( "localization" );
    dir.forEach(function(filename)
    {
      if ( !grunt.file.isFile( "localization/" + filename ) )
        return;
      var file = grunt.file.readJSON( "localization/" + filename, { encoding: "utf8" } );
      if ( file )
      {
        var lang = {
          name: file.language,
          value: file.code
        };
        grunt.config.getRaw( "ngc_localizations" ).push( lang );
      }
    });
    grunt.log.ok( "Found %d available localizations.", grunt.config.getRaw( "ngc_localizations" ).length );
  });
  grunt.registerTask( "loadsmileys", "Load internal list of smiley sets.", function()
  {
    var fs = require( "fs" );
    var dir = fs.readdirSync( "smileys" );
    dir.forEach(function(filename)
    {
      if ( !grunt.file.isFile( "smileys/" + filename ) )
        return;
      var file = grunt.file.readJSON( "smileys/" + filename, { encoding: "utf8" } );
      if ( file )
      {
        var smileyset = {
          name: file.name,
          value: file.code
        };
        grunt.config.getRaw( "ngc_smileysets" ).push( smileyset );
      }
    });
    grunt.log.ok( "Found %d available smiley sets.", grunt.config.getRaw( "ngc_smileysets" ).length );
  });
  grunt.registerTask( "default", ["loadlocalizations","loadsmileys","prompt","compass","preprocess"] );
  grunt.registerTask( "theme", ["compass:dist"] );
};
