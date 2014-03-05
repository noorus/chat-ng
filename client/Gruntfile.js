module.exports = function( grunt )
{
  grunt.initConfig(
  {
    pkg: grunt.file.readJSON( "package.json" ),
    ngc_languages: [],
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
              choices: [
                { name: "default" }
              ],
              default: "default"
            },
            {
              config: "preprocess.options.context.language",
              type: "list",
              message: "Which localization do you want to use?",
              choices: function(){ return grunt.config.getRaw( "ngc_languages" ); },
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
  grunt.registerTask( "loadlanguages", "Load internal list of laanguages.", function()
  {
    var fs = require( "fs" );
    var dir = fs.readdirSync( "localization" );
    dir.forEach(function(filename)
    {
      var file = fs.readFileSync( "localization/" + filename, { encoding: "utf8" } );
      if ( file )
        file = JSON.parse( file );
      if ( file )
      {
        var lang = {
          name: file.language,
          value: file.code
        };
        grunt.config.getRaw( "ngc_languages" ).push( lang );
      }
    });
  });
  grunt.registerTask( "default", ["loadlanguages","prompt","compass","preprocess"] );
  grunt.registerTask( "theme", ["compass:dist"] );
};
