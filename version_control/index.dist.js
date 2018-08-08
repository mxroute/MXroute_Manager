/*
# version_control/index.dist.js                      Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */

require([
    "frameworksBuild",
    "locale!cjtBuild",
    "locale!app/index.cmb",
    "master/master.cmb",
],
function() {

    "use strict";

    require(["cjt/startup"], function(STARTUP) {
        STARTUP
            .startApplication()
            .deferStartMaster();
    });
});
