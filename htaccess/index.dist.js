/*
# htaccess/index.dist.js                             Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */

// Loads the application with the pre-built combined files
require( [
    "frameworksBuild",
    "locale!cjtBuild",
    "master/master.cmb"
], function() {
    require(["cjt/startup"], function(STARTUP) {
        STARTUP.startMaster([
            "master/master",
            "app/index"
        ]);
    });
});
