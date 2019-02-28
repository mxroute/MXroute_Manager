/*
 * wordpress/index.dist.js                            Copyright 2017 cPanel, Inc.
 *                                                           All rights Reserved.
 * copyright@cpanel.net                                         http://cpanel.net
 * This code is subject to the cPanel license. Unauthorized copying is prohibited
 */

/* global require: false */

// Loads the application with the pre-built combined files
require([
        "frameworksBuild",
        "locale!cjtBuild",
        "app/index.cmb"
    ],
    function() {
        require([
            "app/index"
        ], function(APP) {

            // This nested require call will start fetching the master JS, but
            // won't execute until after the application code has run.
            require([
                "master/master"
            ], function(MASTER) {
                    MASTER();
                }
            );

            APP();
        });
    }
);

