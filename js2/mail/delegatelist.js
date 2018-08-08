(function() {

    "use strict";

    var YAHOO = window.YAHOO;
    var CPANEL = window.CPANEL;
    var PAGE = window.PAGE;
    var LOCALE = window.LOCALE;
    var DOM = YAHOO.util.Dom;
    var EVENT = YAHOO.util.Event;

    var progressOverlay;

    var addList = {},
        removeList = {};

    /**
     * Puts a progress overlay on the window so user understands something is happening
     *
     * @method showProgressOverlay
     * @param {String} content_html The string to display under the progress bar
     * @static
     */

    function showProgressOverlay(content_html) {
        if (!progressOverlay || !progressOverlay.cfg) {
            progressOverlay = new CPANEL.ajax.Page_Progress_Overlay(null, {
                zIndex: 2000, // to be above CJT validation message overlays
                covers: CPANEL.Y.one("#delegateWrapper"),
                show_status: true,
                status_html: content_html
            });
        } else {
            progressOverlay.set_status_now(content_html);
        }
        progressOverlay.show();
    }

    /**
     * Moves users from available_users to assigned_users
     * @method addUsers
     */
    var addUsers = function() {
        move_selected_items("available_users", "assigned_users");
    };

    /**
     * Moves users from assigned_users to available_users
     * @method removeUsers
     */
    var removeUsers = function() {
        move_selected_items("assigned_users", "available_users");
    };

    /**
     * Registers an item with the add/remove lists as an "add".
     *
     * @method register_add
     * @param {String} item The value of the item that was added, in this case an email
     * @return {Boolean} Whether the change being registered needs to be saved on the server.
     */
    var register_add = function(item) {
        if (!(item in removeList)) {
            addList[item] = undefined;
            return true;
        }

        delete removeList[item];
        return false;
    };

    /**
     * Registers an item with the add/remove lists as a "remove".
     *
     * @method register_remove
     * @param {String} item The value of the item that was removed, in this case an email
     * @return {Boolean} Whether the change being registered needs to be saved on the server.
     */
    var register_remove = function(item) {
        if (!(item in addList)) {
            removeList[item] = undefined;
            return true;
        }

        delete addList[item];
        return false;
    };

    /**
     * Get the <option> whose value is the given email address.
     *
     * @method get_opt_by_email
     * @param {String} email The value of the list <option> element to find.
     * @return {HTMLOptionElement | null} The option element, if any.
     */
    var get_listopt_by_value = function(email) {
        return DOM.get("listopt_" + email);
    };

    /**
     * Moves items from one select to another
     *
     * @method move_selected_items
     * @param {String} sourceId The id of the select where we will move options from
     * @param {String} targetId The id of the select where we will move options to
     */
    var move_selected_items = function(sourceId, targetId) {
        var sourceEl = DOM.get(sourceId),
            targetEl = DOM.get(targetId);

        var isAdd = (targetId === "assigned_users");

        var addbuttonEl = CPANEL.Y.one("#add_button"),
            delbuttonEl = CPANEL.Y.one("#del_button");

        addbuttonEl.disabled = true;
        delbuttonEl.disabled = true;

        var source_opts = sourceEl.options;
        var sourceEl_length = source_opts.length;

        for (var i = sourceEl_length - 1; i >= 0; i--) {
            if (source_opts[i].selected) {
                var cur_source_opt = source_opts[i];
                var itemvalue = cur_source_opt.value;

                var needs_save;
                if (isAdd) {
                    needs_save = register_add(itemvalue);
                } else {
                    needs_save = register_remove(itemvalue);
                }

                // If we don't explicitly set .value, then setting
                // .text will also set .value (in some browsers, at least).
                if (needs_save) {
                    enable_save();

                    DOM.addClass(cur_source_opt, "needs-save");
                } else {
                    DOM.removeClass(cur_source_opt, "needs-save");

                    if (!obj_has_members(addList) && !obj_has_members(removeList)) {
                        disable_save();
                    }
                }

                insert_option_into_list(cur_source_opt, targetEl);
            }
        }

        addbuttonEl.disabled = false;
        delbuttonEl.disabled = false;
    };

    /**
     * Insert an <option> into a <select>, maintaining text sort.
     * This also de-selects the <option>.
     *
     * @method find_insertbefore_option_for_value
     * @param {HTMLOptionElement} select_el The <option> node to insert.
     * @param {HTMLSelectElement} select_el The <select> node that receives the <option>.
     */
    var insert_option_into_list = function(newopt, select_el) {
        var newvalue = newopt.value;
        var opts = select_el.options;
        var opts_length = opts.length;

        newopt.selected = false;

        for (var o = 0; o < opts_length; o++) {
            if (opts[o].value > newvalue) {
                select_el.insertBefore(newopt, opts[o]);
                return;
            }
        }

        // We didn't find anything that was "after" this option,
        // so it must go at the bottom.
        select_el.appendChild(newopt);
    };

    var set_list_keys_as_saved = function(the_list) {
        for (var value in the_list) {
            var opt = get_listopt_by_value(value);
            DOM.removeClass(opt, "needs-save");
        }
    };

    /**
     * Updates the select boxes to use the most current information returned by the API.
     *
     * @method updateDelegatesWith
     * @param {Array} delegateList An array of delegates used to populate the select box
     */
    var updateDelegatesWith = function(delegateList) {
        var delegate_lookup = {};
        for (var d = delegateList.length; d >= 0; d--) {
            delegate_lookup[delegateList[d]] = 1;
        }

        var assignedUsers = CPANEL.Y.one("#assigned_users");

        var show_refresh_warning;

        var cur_opts = assignedUsers.options;

        // Remove items from the delegates list that aren't in the current list.
        for (var o = cur_opts.length - 1; o >= 0; o--) {
            if (!(cur_opts[o].value in delegate_lookup)) {

                // We don't know if that item has been deleted
                // or simply has had privileges revoked, so
                // just disable it. Show the refresh warning
                // when we're all done.
                cur_opts[o].disabled = true;
                show_refresh_warning = true;
            }
        }

        // Add things from the new delegate list into the UI.
        for (var x = 0; x < delegateList.length; x++) {
            var cur_delegate = delegateList[x];

            var the_opt = get_listopt_by_value(cur_delegate);
            var needs_insert;
            if (the_opt) {
                if (the_opt.parentNode !== assignedUsers) {
                    needs_insert = true;
                }
            } else {
                var the_opt = new Option(cur_delegate);
                the_opt.id = "listopt_" + cur_delegate;
                needs_insert = true;
            }

            if (needs_insert) {
                insert_option_into_list(the_opt, assignedUsers);
            }
        }

        if (show_refresh_warning) {
            makeNoticeOfTypeWithText("warn", LOCALE.maketext("The data on this page is no longer synchronized with the server. Please [output,url,_1,refresh the page].", "javascript:window.reload()"));
        }
    };

    /**
     * Creates a Dynamic_Page_Notice with the supplied paramaters.  Mostly for concise code
     * @method makeNoticeOfTypeWithText
     * @param {String} type The type of notice to generate (warn, error, success)
     * @param {String} text The string to display in the notice
     */
    var makeNoticeOfTypeWithText = function(type, text) {
        var notice = new CPANEL.widgets.Dynamic_Page_Notice({
            visible: false,
            level: type,
            content: text
        });

        notice.animated_show();
    };

    /**
     * Success handler for the API call.  Since remove and add were doing the same functionality this was bundled together
     * @method handleSuccess
     * @param {Object} obj The callback object which contains relevent API information
     */
    var handleSuccess = function(obj) {
        var infoString = LOCALE.maketext("You have successfully updated delegation of administrative privileges for the mailing list “[_1]”.", PAGE.list.html_encode());
        updateDelegatesWith(obj.cpanel_data.delegates);
        progressOverlay.hide();
        makeNoticeOfTypeWithText("success", infoString);

        disable_save();
    };

    /**
     * Function triggered onClick to create API call and send it off
     * @method update_list_admins
     */
    var update_list_admins = function() {
        showProgressOverlay(LOCALE.maketext("Saving …"));
        var removeApiCall = {
            data: {
                delegates: removeList ? Object.keys(removeList).join(",") : "",
                list: PAGE.list
            },
            func: "remove_mailman_delegates",
            module: "Email",
            version: "3"
        };

        var addApiCall = {
            data: {
                delegates: addList ? Object.keys(addList).join(",") : "",
                list: PAGE.list
            },
            func: "add_mailman_delegates",
            module: "Email",
            version: "3"
        };

        removeApiCall.callback = CPANEL.ajax.build_page_callback(
            function(obj) {
                set_list_keys_as_saved(removeList);

                removeList = {};
                if (obj_has_members(addList)) {
                    CPANEL.api(addApiCall);
                } else {
                    handleSuccess(obj);
                }
            }, {
                on_error: progressOverlay.hide.bind(progressOverlay)
            });

        addApiCall.callback = CPANEL.ajax.build_page_callback(
            function(obj) {
                set_list_keys_as_saved(addList);

                addList = {};
                handleSuccess(obj);
            }, {
                on_error: progressOverlay.hide.bind(progressOverlay)
            });

        if (obj_has_members(removeList)) {
            CPANEL.api(removeApiCall);
        } else if (obj_has_members(addList)) {
            CPANEL.api(addApiCall);
        }
    };

    /**
     * In case there are ever thousands of members of objects;
     * we have several places here where we only care about whether
     * whether there are any keys in the object.
     *
     * @method does_obj_have_members
     * @param obj {Object} The object to examine.
     * @return {Boolean} Whether there are any members in the object.
     */
    var obj_has_members = function(obj) {
        for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
                return true;
            }
        }

        return false;
    };

    /**
     * Enable the page’s [Save] button.
     *
     * @method enable_save
     */
    var enable_save = function() {
        DOM.get("save_button").disabled = false;
    };

    /**
     * Enable the page’s [Save] button.
     *
     * @method disable_save
     */
    var disable_save = function() {
        DOM.get("save_button").disabled = true;
    };

    /**
     * Initialize the page: event listeners
     * @method initialize
     */
    var initialize = function() {
        EVENT.on("add_button", "click", addUsers);
        EVENT.on("available_users", "dblclick", addUsers);
        EVENT.on("del_button", "click", removeUsers);
        EVENT.on("assigned_users", "dblclick", removeUsers);

        EVENT.on("save_button", "click", update_list_admins);
    };

    // Register startup events.
    EVENT.onDOMReady(initialize);

}());
