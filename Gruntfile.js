/* global module: false, global: true, __dirname: false */

module.exports = function(grunt) {

    global.BUILD_ROOT = __dirname;

    grunt.loadNpmTasks("grunt-cpanel-optimizer");
    grunt.loadNpmTasks("grunt-cpanel-karma");

    grunt.registerTask("default", [
        "optimize"
    ]);
};
