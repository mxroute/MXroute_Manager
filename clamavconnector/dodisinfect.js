/*
# clamavconnector/dodisinfect.js                  Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define:false */

define(
    [
        "jquery"
    ], function($) {
        $(document).ready(function() {
            $.get(CPANEL.PAGE.ajax_request_url, CPANEL.PAGE.formdata)
                .done(function(data) {
                    $("#results").html(data);
                })
                .fail(function() {
                    $("#results").text(LOCALE.maketext("An error occurred while processing your request."));
                });
        });
    }
);
