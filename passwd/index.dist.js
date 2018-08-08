/*
# passwd/index.dist.js                               Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */

require([
    "frameworksBuild",
    "locale!cjtBuild",
    "app/index.cmb",
    "master/master.cmb"
], function() {
    require(["cjt/startup"], function(STARTUP) {
        STARTUP
            .startApplication()
            .deferStartMaster();
    });
});
