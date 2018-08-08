(function() {

    // Imports
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;
    var Page_Notice = CPANEL.widgets.Page_Notice;

    // Register startup events.
    EVENT.onDOMReady(function() {
        var PAGE = window.PAGE;
        var content;
        var notice;

        var el = DOM.get("delete-status");
        if (el) {
            content = el.innerHTML;
            el.innerHTML = "";
            notice = new Page_Notice({
                level: PAGE.properties.deleted ? "success" : "error",
                content: content,
                container: el,
                visible: true
            });
            notice.show();
        }

        var dependentErrors = DOM.get("dependent-errors");
        if (dependentErrors) {
            var dependentContent = dependentErrors.innerHTML;
            dependentErrors.innerHTML = "";
            var dependentNotice = new Page_Notice({
                level: "error",
                content: dependentContent,
                container: dependentErrors
            });
        }
    });
})();
