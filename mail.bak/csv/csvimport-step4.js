/*
# mail/csv/csvimport-step4.js                     Copyright(c) 2015 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited
*/

/* global define:false */

define(
    [
        "jquery"
    ], function($) {

        var fullbar = 530;

        // This function is called from the live api in
        // Cpanel/CSVImport.pm
        function setcompletestatus(incount, totalcount) {
            var incountEl = document.getElementById("incount"),
                totalCountEl = document.getElementById("totalcount"),
                uploadBarEl = document.getElementById("uploadbar"),
                progressBarEl = document.getElementById("progressbar");

            if (incountEl !== null) {
                incountEl.innerHTML = incount;
            }

            if (totalCountEl !== null) {
                totalCountEl.innerHTML = totalcount;
            }

            if (uploadBarEl !== null) {
                uploadBarEl.width = parseInt(incount / totalcount * fullbar, 10);
            }

            if (progressBarEl !== null) {
                progressBarEl.style.display = "";
            }
        }

        // export this function globally so it can be called via the live api
        window.setcompletestatus = setcompletestatus;


        $(document).ready(function() {
            $.get(CPANEL.PAGE.ajax_request_url)
                .done(function(data) {
                    $("#import-output-formatted").html(data);
                })
                .fail(function() {
                    $("#import-output-formatted").html(LOCALE.maketext("An error occurred while processing your request."));
                });
        });
    }
);
