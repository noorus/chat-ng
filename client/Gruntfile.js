module.exports = function( grunt )
{
  grunt.initConfig(
  {
    pkg: grunt.file.readJSON( "package.json" ),
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
              choices: [
                { name: "English", value: "en" },
                { name: "Finnish", value: "fi" }
              ],
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
  grunt.registerTask( "default", ["prompt","compass","preprocess"] );
};
