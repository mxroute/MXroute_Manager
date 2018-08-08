/*
# file_and_directory_restoration/index.dist.js
#                                                    Copyright 2018 cPanel, Inc.
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
    "master/master.cmb",
],
function() {
    "use strict";
    require(
        [
            "app/index"
        ],
        function(APP) {
            APP();
        }
    );

    setTimeout(function() {
        require(
            [
                "master/master"
            ],
            function(MASTER) {
                MASTER();
            }
        );
    }, 5);
});
