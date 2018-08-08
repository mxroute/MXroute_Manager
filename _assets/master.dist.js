/*
# _assets/master.dist.js                             Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */
require(
    [
        "frameworksBuild",
        "locale!cjtBuild",
        "master/master.cmb"
    ], function() {

        // This startup code is only used for legacy
        // style applications.
        //
        // Since there are no other applications, we
        // just startup the master application.
        require(["cjt/startup"], function(STARTUP) {
            STARTUP.startMaster();
        });
    }
);
