module.exports = function( grunt )
{
  grunt.initConfig({
    pkg: grunt.file.readJSON( "package.json" ),
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
    }
  });
  grunt.loadNpmTasks( "grunt-contrib-compass" );
  grunt.registerTask( "default", ["compass"] );
};
