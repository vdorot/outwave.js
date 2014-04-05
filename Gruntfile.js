module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    yuidoc: {
      build: {
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
    clean: ['doc/api','build/*'],

    browserify: {
      build: {
        files: {
          'build/outwave/outwave.js': ['lib/outwave/outwave.js'],
        },
        options: {
          transform: ['deamdify'],
          bundleOptions: {
            standalone: "Outwave"
          }
        },
      }
    },
    uglify: {
      build: {
        files: {'build/outwave/outwave.min.js': ['build/outwave/outwave.js']}
      }
    },
    copy: {
      build: {
        files: [
          {expand: true, cwd: 'lib/outwave/css/', src: ["**"], dest:"build/outwave/css/"}
        ]
      }

    }

  });

  grunt.loadNpmTasks('grunt-contrib-yuidoc');

  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.loadNpmTasks('grunt-contrib-copy');

  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.loadNpmTasks('grunt-browserify');


  grunt.registerTask('doc',['yuidoc:build']);

  grunt.registerTask('build',['clean','browserify:build','uglify:build','copy:build','doc']);

};