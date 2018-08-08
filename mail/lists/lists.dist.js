/*
# mail/lists/lists.dist.js                           Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */

// Loads the application with the pre-built combined files

/*
 *  This is essentially a wrapper function that redirects to the main delegated_lists file
 *  it could be tweaked to run delegated_lists differently in distribution form.
 *
 */

require([
    "frameworksBuild",
    "locale!cjtBuild",
    "locale!app/lists.cmb",
    "master/master.cmb"
], function() {
    require(["cjt/startup"], function(STARTUP) {
        STARTUP
            .startApplication("app/lists")
            .deferStartMaster();
    });
});
