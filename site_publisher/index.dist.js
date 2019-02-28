/*
# site_publisher/index.dist.js                       Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */

// Loads the application with the pre-built combined files

require([
    "frameworksBuild",
    "locale!cjtBuild",
    "locale!app/index.cmb",
    "master/master.cmb"
],
function() {
    require(["cjt/startup"], function(STARTUP) {
        STARTUP
            .startApplication()
            .deferStartMaster();
    });

    // The following lines are a workaround for CPANEL-3887. Having a dummy mt call
    // ensures that the minified version of this file is not deleted during a build.
    require(["cjt/util/locale"], function(LOCALE) {
        LOCALE.maketext("Enabled");
    });
});
