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
    "use strict";

    require(["cjt/startup"], function(STARTUP) {
        STARTUP
            .startApplication()
            .deferStartMaster();
    });
});
