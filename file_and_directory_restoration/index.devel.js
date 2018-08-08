/*
# file_and_directory_restoration/index-devel.js
#                                                    Copyright 2018 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */

// Loads the application with the non-combined files

require([
    "locale!app/index.cmb"
],
function() {
    "use strict";
    require(
        [
            "master/master",
            "app/index"
        ],
        function(MASTER, APP) {
            MASTER();
            APP();
        }
    );
}
);
