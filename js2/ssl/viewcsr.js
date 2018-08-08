(function(window) {
    "use strict";

    // Imports
    var YAHOO = window.YAHOO;
    var CPANEL = window.CPANEL;
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;

    /**
     * Toggle the display property to alternatively show/hide the element
     * @method toggleDisplay
     * @param  {HTMLElement} el element to toggle
     */
    var toggleDisplay = function(el) {
        if (!el) {
            return;
        }

        if (DOM.getStyle(el, "display") === "none") {
            DOM.setStyle(el, "display", "");
        } else {
            DOM.setStyle(el, "display", "none");
        }
    };

    /**
     * Initialize the page
     * @method initialize
     */
    var initialize = function() {

        var PAGE = window.PAGE;
        var content;
        var notice;

        // Setup the events on the page.
        var detailsEl = DOM.get("details");
        EVENT.on("gen_error_more", "click", function(e) {
            toggleDisplay(detailsEl);
        });

        // Set the focus to the CSR since they likely need to copy it.
        var encodedCSREl = DOM.get("encoded-csr");
        if (encodedCSREl) {
            encodedCSREl.focus();
        }

        // Render the friendly-name save notice
        var updateEl = DOM.get("save-status");
        if (updateEl) {
            content = updateEl.innerHTML;
            updateEl.innerHTML = "";
            DOM.setStyle(updateEl, "display", "");
            var success = PAGE.properties.csr_properties_saved && PAGE.properties.csr_properties_saved_success;
            notice = new CPANEL.widgets.Dynamic_Page_Notice({
                level: success ? "success" : "error",
                content: content,
                container: updateEl
            });
            notice.show();
        }

        // Render the error message notice
        var errorEl = DOM.get("show-failed");
        if (errorEl) {
            content = errorEl.innerHTML;
            errorEl.innerHTML = "";
            DOM.setStyle(errorEl, "display", "");
            notice = new CPANEL.widgets.Dynamic_Page_Notice({
                level: "error",
                content: content,
                container: errorEl
            });
            notice.show();
        }
    };

    // Register startup events.
    EVENT.onDOMReady(initialize);
}(window));
