/*
# mail/authentication/manage.dist.js                 Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false, define: false */
/* jshint -W098 */

require([
    "frameworksBuild",
    "locale!cjtBuild",
    "app/manage.cmb",
    "master/master.cmb"
], function() {
    require(["cjt/startup"], function(STARTUP) {
        STARTUP
            .startApplication("app/manage")
            .deferStartMaster();
    });
});
