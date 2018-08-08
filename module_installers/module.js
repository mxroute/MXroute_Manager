/* global define: false */
define(
    [
        "jquery"
    ], function($) {

        function isScrolledToEnd(El) {
            return ((El.scrollTop + El.offsetHeight + 1 >= El.scrollHeight) || (El.scrollHeight <= El.offsetHeight)) ? 1 : 0;
        }

        $(document).ready(function() {
            var xhr;
            var request = $.ajax({
                url: CPANEL.PAGE.ajax_request_url,
                xhr: function() {
                    xhr = jQuery.ajaxSettings.xhr();
                    return xhr;
                },
                timeout: 3000000,
            });

            var moduleOutputContainer = $("#module-output-formatted")[0];
            var request_string_position = 0;
            var request_poller = window.setInterval(function() {
                if (xhr && xhr.readyState === 3) {
                    var rawdata;
                    try {
                        rawdata = xhr.responseText.substr(request_string_position);
                    } catch ( e ) {
                        return;
                    }

                    request_string_position += rawdata.length;

                    var was_at_end = isScrolledToEnd(moduleOutputContainer);
                    $("#module-output-formatted").append(rawdata);
                    if (was_at_end) {
                        moduleOutputContainer.scrollTop = moduleOutputContainer.scrollHeight;
                    }
                }
            }, 500);

            request.always(function() {
                $("#module-output-spinner").html(LOCALE.maketext("Completed"));
                window.clearInterval(request_poller);
            });
            request.done(function(data) {
                var was_at_end = isScrolledToEnd(moduleOutputContainer);
                $("#module-output-formatted").text(data);
                if (was_at_end) {
                    moduleOutputContainer.scrollTop = moduleOutputContainer.scrollHeight;
                }
            });
            request.fail(function(rObj, errorText) {
                $("#module-output-formatted").text(LOCALE.maketext("An error occurred while processing your request: [_1]", errorText));
            });
        });
    }
);
