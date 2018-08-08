(function() {

    // Imports
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;

    // Register startup events.
    EVENT.onDOMReady(function() {
        var PAGE = window["PAGE"];
        var content;
        var notice;

        // Set the focus to the Private Key since they likely need to copy it.
        var encodedKeyEl = DOM.get("encoded-key");
        if (encodedKeyEl) {
            encodedKeyEl.focus();
        }

        var updateEl = DOM.get("save-status");
        if (updateEl) {
            content = updateEl.innerHTML;
            updateEl.innerHTML = "";
            DOM.setStyle(updateEl, "display", "");
            var success = PAGE.properties.key_properties_saved && PAGE.properties.key_properties_saved_success;
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

    });
})();
