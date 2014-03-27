module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    yuidoc: {
      compile: {
        name: '<%= pkg.name %>',
        description: '<%= pkg.description %>',
        version: '<%= pkg.version %>',
        url: '<%= pkg.homepage %>',
        options: {
          paths: 'lib/outwave',
          outdir: 'doc/api'
        }
      }
    },
    clean: ['doc/api']
  });

  grunt.loadNpmTasks('grunt-contrib-yuidoc');

  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.loadNpmTasks('grunt-contrib-requirejs');


/*
  grunt.registerTask('test', ['jshint', 'qunit']);

  grunt.registerTask('default', ['jshint', 'qunit', 'concat', 'uglify']);
*/
  grunt.registerTask('doc',['yuidoc']);

};