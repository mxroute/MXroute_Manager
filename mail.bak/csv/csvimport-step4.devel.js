/*
# mail/csv/csvimport-step4.devel.js               Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global require: false */

// Loads the application with the non-combined files
require(
    [
        "master/master",
        "app/csv/csvimport-step4"
    ],
    function(MASTER) {
        MASTER();
    }
);
