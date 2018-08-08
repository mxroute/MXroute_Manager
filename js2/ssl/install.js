/*
# cpanel - base/frontend/paper_lantern/js2/ssl/install.js
#                                                    Copyright 2017 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cpanel license. Unauthorized copying is prohibited
*/

/* jshint esnext:true */

/* global LOCALE:false */

(function(window) {

    "use strict";

    if (!window.PAGE) {
        return; //Either the account lacks the feature, or the server lacks SNI.
    }

    var document = window.document;

    var DOM = window.DOM;
    var EVENT = window.EVENT;

    var CPANEL = window.CPANEL;
    var YAHOO = window.YAHOO;

    var page_data = window.PAGE.data;
    var installable_domains = page_data.installable_domains;
    var HOMEDIR = page_data.homedir;
    var HOMEDIR_REGEXP = HOMEDIR && new RegExp("^" + HOMEDIR.regexp_encode());
    var DEDICATED_IP = page_data.dedicated_ip;
    if (DEDICATED_IP === "0") {
        DEDICATED_IP = null;
    }
    var HTML_SOLIDUS_REGEXP = new RegExp("/".html_encode().regexp_encode(), "mg");

    var Handlebars = window.Handlebars;

    var FQDNS_COLUMN_WIDTH = 30;

    //NOTE: If this array changes, be sure to update page_data as well
    //so that the cert browser popup will receive the new logic.
    var installed_ssl_hosts = page_data.installed_ssl_hosts;

    //Potentially reusable stuff - possibly for separate modules?
    //----------------------------------------------------------------------

    /**
     * Sorter for IPv4 addresses.
     *
     * @param a {String} The first sort item
     * @param b {String} The second sort item
     * @return {Number} -1, 0, or 1
     */
    var _ips_cache = {};

    function sorter_ipv4(a, b) {
        if (!_ips_cache[a]) {
            _ips_cache[a] = String.fromCharCode.apply(String, a.split("."));
        }
        if (!_ips_cache[b]) {
            _ips_cache[b] = String.fromCharCode.apply(String, b.split("."));
        }

        return _ips_cache[a] < _ips_cache[b] ? -1 : (_ips_cache[a] > _ips_cache[b] ? 1 : 0);
    }

    /**
     * Formatter for yes/no columns.
     *
     * @param el {HTMLElement} The element to format with the markup.
     * @param rec {YAHOO.widget.Record} Record instance.
     * @param col {YAHOO.widget.Column} Column instance.
     * @param value {?} Whatever the data for that record and column are.
     */

    function format_yesno(el, rec, col, value) {
        el.innerHTML = value ? yes_str : no_str;
    }
    var yes_str = LOCALE.maketext("Yes");
    var no_str = LOCALE.maketext("No");

    //----------------------------------------------------------------------

    /**
     * YUI DataSource doesn't know how to traverse deep structures for local data.
     * (Even though it knows how to do this for remote data...)
     * So, this fetches deep data and puts it at the top level.
     *
     * @param req {Object} YUI request object
     * @param resp {Object} YUI response object
     * @return {object} The altered YUI response object
     */
    var format_api_response_for_yui = function(req, resp) {
        var len = resp.length;
        for (var i = 0; i < len; i++) {
            var cur_resp = resp[i];
            cur_resp.certificate_id = cur_resp.certificate.id;
            cur_resp.certificate_modulus_length = cur_resp.certificate.modulus_length;
            cur_resp.certificate_not_after = cur_resp.certificate.not_after;
        }

        return resp;
    };

    /**
     * DataTable sorter for the "fqdns" field
     *
     * @param a {YAHOO.widget.Record} The first sort item
     * @param b {YAHOO.widget.Record} The second sort item
     * @param desc {Boolean} Whether the sort is a descending sort or not
     * @return {Number} -1, 0, or 1
     */

    function sortDomainsArray(a, b, desc) {
        return CPANEL.widgets.ssltable.sorterStringArray(a.getData("fqdns"), b.getData("fqdns")) * (desc ? -1 : 1);
    }

    /**
     * DataTable sorter for the "ip" field
     *
     * @param a {YAHOO.widget.Record} The first sort item
     * @param b {YAHOO.widget.Record} The second sort item
     * @param desc {Boolean} Whether the sort is a descending sort or not
     * @return {Number} -1, 0, or 1
     */

    function sort_datatable_ips(a, b, desc) {
        return sorter_ipv4(a.getData("ip"), b.getData("ip")) * (desc ? -1 : 1);
    }

    /**
     * Formatter for the hosts datatable's "actions" column.
     *
     * @param el {HTMLElement} The element to format with the markup.
     * @param rec {YAHOO.widget.Record} Record instance.
     * @param col {YAHOO.widget.Column} Column instance.
     */

    function format_actions(el, rec, col) {
        el.innerHTML = hosts_actions_template({
            certificate_id: rec.getData("certificate_id"),
            can_be_set_primary: DEDICATED_IP && !rec.getData("is_primary_on_ip") && !/^\*/.test(rec.getData("servername")),
        });
    }

    /**
     * Formatter for the hosts datatable's "certificate_id" column.
     *
     * @param el {HTMLElement} The element to format with the markup.
     * @param rec {YAHOO.widget.Record} Record instance.
     * @param col {YAHOO.widget.Column} Column instance.
     * @param d {?} Whatever the data for that record and column are.
     */

    /* XXX: Currently not in use since certificates column is not being used but code is kept for use later
function format_cert_id(el, rec, col, d) {
el.innerHTML = hosts_cert_id_template( {
    certificate_id: d,
    short_id: LOCALE.elide(d, 10, 3)
} );
};
*/

    /**
     * Formatter for the hosts datatable's "fqdns" column.
     * TODO: Put the hidden-whitespace-injection in here.
     *
     * @param el {HTMLElement} The element to format with the markup.
     * @param rec {YAHOO.widget.Record} Record instance.
     * @param col {YAHOO.widget.Column} Column instance.
     * @param d {?} Whatever the data for that record and column are.
     */

    function format_fqdns(el, rec, col, value) {
        var cert_domains = CPANEL.ssl.parseCertificateText(rec.getData("certificate_text")).domains;

        var domain_list = [];
        for (var i = 0; i < value.length; i++) {
            var working_domain = null;
            if (CPANEL.ssl.doesDomainMatchOneOf(value[i], cert_domains)) {
                working_domain = value[i];
            }

            domain_list[i] = {
                itemClass: working_domain ? "working" : "not-working",
                isWorking: !!working_domain,
                title: value[i],
                text: LOCALE.elide(value[i], FQDNS_COLUMN_WIDTH, 3)
            };
        }

        var template_data = {
            listClass: "domain-list",
            items: domain_list
        };

        el.innerHTML = CPANEL.widgets.ssltable.listTemplate(template_data);
    }

    /**
     * Formatter for the hosts datatable's "docroot" column.
     *
     * @param el {HTMLElement} The element to format with the markup.
     * @param rec {YAHOO.widget.Record} Record instance.
     * @param col {YAHOO.widget.Column} Column instance.
     * @param d {?} Whatever the data for that record and column are.
     */

    function format_docroot(el, rec, col, value) {
        var dirString = value;

        if (HOMEDIR_REGEXP) {

            //Remove the Home Directory from the string
            dirString = dirString.replace(HOMEDIR_REGEXP, "");
        }

        dirString = dirString.html_encode();
        //Drop in 0 width spaces so directories break on /
        dirString = dirString.replace(HTML_SOLIDUS_REGEXP, "$&<wbr><a class=\"wbr\"></a>");
        el.title = value;

        el.innerHTML = document_root_template({
            documentRoot: dirString
        });
    }

    /**
     * Listener for "details" link in SSL hosts datatable.
     *
     * @param e {Object} The object that YAHOO.util.Event.on gives to listeners
     */

    function details_click_listener(e) {
        var dt = ssl_datatable;
        var link = e.target;

        var row_el = DOM.getAncestorByTagName(link, "tr");
        dt.toggleRowExpansion(row_el);

        CPANEL.align_panels_event.fire();
    }

    /**
     * Listener for "new host" link in SSL hosts datatable.
     *
     * @param e {Object} The object that YAHOO.util.Event.on gives to listeners
     */

    function new_host_click_listener(e) {
        var dt = ssl_datatable;
        var link = e.target;

        var row_el = DOM.getAncestorByTagName(link, "tr");
        _use_ssl_host_record_for_new_host(dt.getRecord(row_el).getData());
    }

    /**
     * Implement the "Use Certificate For New Site" behavior.
     *
     * @param record {Object} An SSL host record as returned by SSL::installed_hosts
     */

    function _use_ssl_host_record_for_new_host(record) {
        var cert = record.certificate_text;

        var form_data = CPANEL.dom.get_data_from_form("mainform");

        //If the user doesn't already have a domain chosen, choose the first one
        //that matches the cert and that's not on the current vhost.
        if (!form_data.domain) {
            var vhost_domains = record.fqdns;
            var cert_domains = CPANEL.ssl.parseCertificateText(cert).domains;
            for (var d = 0; d < installable_domains.length; d++) {
                var cur_domain = installable_domains[d];
                if (vhost_domains.indexOf(cur_domain) === -1) {
                    if (CPANEL.ssl.doesDomainMatchOneOf(cur_domain, cert_domains)) {
                        if (CPANEL.dom.set_form_el_value("ssldomain", cur_domain)) {
                            break;
                        }
                    }
                }
            }
        }

        CPANEL.dom.set_form_el_value("sslcrt", cert);

        //Leave "ssldomain" alone once the results come back.
        window.fetch_for_install_form("crt", ["ssldomain"]);

        var windowScroll = new CPANEL.animate.WindowScroll("mainform");
        windowScroll.animate();
    }

    /**
     * Listener for "new host" link in SSL hosts datatable.
     *
     * @param e {Object} The object that YAHOO.util.Event.on gives to listeners
     */

    function make_primary_click_listener(e) {
        var dt = ssl_datatable;

        var link = e.target;
        var row_el = DOM.getAncestorByTagName(link, "tr");
        var record = dt.getRecord(row_el);

        var servername = record.getData("servername");

        var callback = _make_overlay_and_callback({
            progress_html: LOCALE.maketext("Setting “[_1]” as the primary SSL host on “[_2]” …", servername.html_encode(), record.getData("ip").html_encode()),
            success_html: LOCALE.maketext("“[_1]” is now the primary SSL host on “[_2]”.", servername.html_encode(), record.getData("ip").html_encode())
        }).callback;

        CPANEL.api({
            version: 3,
            module: "SSL",
            func: "set_primary_ssl",
            data: {
                servername: servername
            },
            callback: callback
        });
    }

    /**
     * Send off a table refresh request to the server.
     * If a "table_overlay" is passed in, this will set that overlay's status right away
     * then hide the overlay when the response comes back.
     *
     * @param opts {Object} Named parameters, currently accepts optional "table_overlay" key
     */

    function start_refresh_table(opts) {
        var page_callback_opts = {};
        if (opts && opts.table_overlay) {
            page_callback_opts.hide_on_return = opts.table_overlay;
            opts.table_overlay.set_status(LOCALE.maketext("Loading …"));
        }

        CPANEL.api({
            version: 3,
            module: "SSL",
            func: "installed_hosts",
            callback: CPANEL.ajax.build_page_callback(
                function(o) {
                    installed_ssl_hosts = o.cpanel_data;

                    load_table_data();

                    CPANEL.sharedjs.sslinstall.updateUI();
                    CPANEL.sharedjs.sslinstall.runValidation();
                },
                page_callback_opts
            )
        });
    }

    /**
     * Listener for "update certificate" link in SSL hosts datatable.
     *
     * @param e {Object} The object that YAHOO.util.Event.on gives to listeners
     */

    function update_click_listener(e, args) {
        var dt = args.datatable;

        var link = e.target;
        var row_el = DOM.getAncestorByTagName(link, "tr");

        _update_host_certificate({
            host_record: dt.getRecord(row_el).getData()
        });
    }

    /**
     * Implement the "Update Certificate" behavior.
     *
     * @private
     * @param opts {Object}
     *   host_record {Object} - Single record, as returned by SSL::installed_hosts
     */

    function _update_host_certificate(opts) {
        var host_record = opts.host_record;

        //We want to pre-select the domains drop-down to the first domain
        //that the current certificate supports, but only if the user hasn't
        //already selected one of the "acceptable" domains.
        var host_fqdns = host_record.fqdns;

        var chosen_domain = CPANEL.dom.get_data_from_form("mainform").domain;

        var need_to_set = !chosen_domain || !CPANEL.ssl.doesDomainMatchOneOf(
            chosen_domain,
            host_fqdns
        );

        if (need_to_set) {

            //We can’t be sure which domain on the vhost is the user’s
            //intended domain. (Not that it matters since every domain on
            //the vhost uses the same cert, but for a smooth UX we should
            //ideally still pick the most matchy-looking one.)
            //
            //Anyway, we do know that the shortest FQDN on
            //the vhost will be on the list of domains to choose and is a
            //likely favorite anyway, so let’s just default to that one.
            var length_sorted_fqdns = host_record.fqdns.slice(0).sort( function(a,b) {
                return( a.length < b.length ? -1 : a.length === b.length ? 0 : 1 );
            } );

            CPANEL.dom.set_form_el_value("ssldomain", length_sorted_fqdns[0]);
        }

        //Mixed feelings about this...but it seems logical and expected.
        CPANEL.dom.set_form_el_value("sslcrt", "");
        CPANEL.dom.set_form_el_value("sslkey", "");
        CPANEL.dom.set_form_el_value("sslcab", "");

        CPANEL.sharedjs.sslinstall.updateUI({
            active_element: "domain"
        });
        CPANEL.sharedjs.sslinstall.clearValidation();

        var windowScroll = new CPANEL.animate.WindowScroll("mainform");
        windowScroll.animate();
    }

    /**
     * Listener for "uninstall" link in SSL hosts datatable.
     *
     * @param e {Object} The object that YAHOO.util.Event.on gives to listeners
     */

    function uninstall_click_listener(e, args) {
        var dt = args.datatable;

        var link = e.target;
        var row_el = DOM.getAncestorByTagName(link, "tr");
        var record = dt.getRecord(row_el);

        var servername = record.getData("servername");

        var confirmation = new CPANEL.ajax.Common_Dialog();
        confirmation.setHeader(CPANEL.widgets.Dialog.applyDialogHeader(LOCALE.maketext("Confirm SSL Host Delete")));
        confirmation.setBody("");
        confirmation.render(document.body);
        confirmation.form.innerHTML = LOCALE.maketext("Are you sure that you want to delete the SSL host “[_1]”? This operation cannot be undone!", servername.html_encode());

        confirmation.submitEvent.subscribe(function(e) {
            do_uninstall(servername);
            confirmation.hide_to_point(link);
            return false;
        });

        confirmation.show_from_source(link);
    }

    /**
     * What actually sends off the API request to uninstall the SSL vhost.
     *
     * @param servername {String} The SSL vhost's servername
     */

    function do_uninstall(servername) {

        var callback = _make_overlay_and_callback({
            progress_html: LOCALE.maketext("Deleting SSL host “[_1]” …", servername.html_encode()),
            success_html: LOCALE.maketext("The SSL host for “[_1]” has been removed.", servername.html_encode())
        }).callback;

        CPANEL.api({
            version: 3,
            module: "SSL",
            func: "delete_ssl",
            data: {
                domain: servername
            },
            callback: callback
        });
    }


    /**
     * Common code for handling SSL hosts table AJAX calls.
     *
     * @param opts {Object} Two strings: progress_html, success_html
     */

    function _make_overlay_and_callback(opts) {
        var overlay = new CPANEL.ajax.Page_Progress_Overlay(null, {
            covers: DOM.get("installed_ssl_hosts_table"),
            show_status: true,
            status_html: opts.progress_html
        });
        overlay.show();

        var callback = CPANEL.ajax.build_page_callback(
            function(o) {
                var success_notice = new CPANEL.widgets.Dynamic_Page_Notice({
                    visible: false,
                    level: "success",
                    content: opts.success_html
                });

                var animation = success_notice.animated_show();
                animation.onTween.subscribe(
                    function() {
                        try {
                            overlay.align();
                            CPANEL.align_panels_event.fire();
                        } catch (e) {} //Maybe the overlay was destroyed before this animation finished?
                    }
                );

                start_refresh_table({
                    table_overlay: overlay
                });
            }, {
                on_cancel: overlay.hide.bind(overlay),
                on_error: overlay.hide.bind(overlay)
            }
        );

        return {
            callback: callback,
            overlay: overlay
        };
    }

    /**
     * Reads the "installed_ssl_hosts" module variable and rebuilds the table from it.
     */

    function load_table_data() {

        var installedHostsArea = CPANEL.Y.one("#installed_ssl_hosts_area");

        if (installed_ssl_hosts.length && installedHostsArea) {
            DOM.removeClass(installedHostsArea, "no-hosts-installed");
        } else {
            DOM.addClass([installedHostsArea, "non_sni_certificate"], "no-hosts-installed");
        }

        var datasource = new YAHOO.util.LocalDataSource(
            installed_ssl_hosts, {
                responseSchema: {
                    fields: hosts_data_fields
                }
            }
        );
        datasource.doBeforeParseData = format_api_response_for_yui;

        CPANEL.widgets.ssltable.loadTableAndSort(ssl_datatable, {
            datasource: datasource
        });
    }

    function _attach_table_click_listeners() {
        var cert_id_details_links = CPANEL.Y.all("#installed_ssl_hosts_table .action-links .details-link");
        var l;
        for (l = cert_id_details_links.length - 1; l >= 0; l--) {
            EVENT.on(cert_id_details_links[l], "click", details_click_listener, {
                datatable: ssl_datatable
            });
        }

        var cert_id_new_host_links = CPANEL.Y.all("#installed_ssl_hosts_table .action-links .new-host-link");
        for (l = cert_id_new_host_links.length - 1; l >= 0; l--) {
            EVENT.on(cert_id_new_host_links[l], "click", new_host_click_listener, {
                datatable: ssl_datatable
            });
        }

        var make_primary_links = CPANEL.Y.all("#installed_ssl_hosts_table .action-links .make-primary-link");
        for (l = make_primary_links.length - 1; l >= 0; l--) {
            EVENT.on(make_primary_links[l], "click", make_primary_click_listener, {
                datatable: ssl_datatable
            });
        }

        var update_links = CPANEL.Y.all("#installed_ssl_hosts_table .action-links .update-link");
        for (l = update_links.length - 1; l >= 0; l--) {
            EVENT.on(update_links[l], "click", update_click_listener, {
                datatable: ssl_datatable
            });
        }

        var uninstall_links = CPANEL.Y.all("#installed_ssl_hosts_table .action-links .uninstall-link");
        for (l = uninstall_links.length - 1; l >= 0; l--) {
            EVENT.on(uninstall_links[l], "click", uninstall_click_listener, {
                datatable: ssl_datatable
            });
        }
    }

    var hosts_data_fields = [
        "fqdns",
        "docroot",
        "certificate_id",
        "servername",
        "certificate_text", {
            key: "certificate_modulus_length",
            parser: "number"
        }, {
            key: "certificate_not_after",
            parser: CPANEL.widgets.ssltable.parseUnixDate
        }
    ];
    if (DEDICATED_IP) {
        hosts_data_fields.push({
            key: "is_primary_on_ip",
            parser: "number"
        });

        hosts_data_fields.push({
            key: "needs_sni",
            parser: "number"
        });
    }

    var hosts_columns = [{
        key: "fqdns",
        label: LOCALE.maketext("[output,abbr,FQDN,Fully Qualified Domain Name]s"),
        sortable: true,
        sortOptions: {
            sortFunction: sortDomainsArray
        },
        formatter: format_fqdns
    }];

    if (DEDICATED_IP) {
        hosts_columns.push({
            key: "is_primary_on_ip",
            label: LOCALE.maketext("Is Primary Website on IP Address?"),
            sortable: true,
            formatter: format_yesno
        });

        hosts_columns.push({
            key: "needs_sni",
            label: LOCALE.maketext("Is Web [output,acronym,SNI,Server Name Indication] Required?"),
            sortable: true,
            formatter: format_yesno
        });
    }

    hosts_columns.push({
        key: "certificate_not_after",
        label: LOCALE.maketext("Certificate Expiration").replace(/\s+/, '<br>'),
        sortable: true,
        formatter: CPANEL.widgets.ssltable.formatCertificateExpiration
    }, {
        key: "docroot",
        label: LOCALE.maketext("Document Root"),
        sortable: true,
        formatter: format_docroot
    }, {
        key: "actions",
        label: LOCALE.maketext("Actions"),
        sortable: false,
        formatter: format_actions
    });

    if (!DEDICATED_IP) {
        /* jshint -W031 */
        new CPANEL.widgets.Page_Notice({
            container: "sni_warning_container",
            level: "warn",
            content: LOCALE.maketext("[output,strong,Note:] You do not have a dedicated IP address. As a result, web browsers that do not support [output,abbr,SNI,Server Name Indication] will probably give false security warnings to your users when they access any of your SSL websites.") + " " + LOCALE.maketext("Microsoft® Internet Explorer™ on Windows XP™ is the most widely used web browser that does not support SNI.")
        });
        /* jshint +W031 */
    }

    var hosts_actions_template = Handlebars.compile(DOM.get("ssl_hosts_action_template").text);

    var document_root_template = Handlebars.compile(DOM.get("document_root_template").text);

    var ssl_datatable = new YAHOO.widget.RowExpansionDataTable(
        "installed_ssl_hosts_table",
        hosts_columns,
        new YAHOO.util.LocalDataSource(), //dummy for the initial load
        {
            initialLoad: false,
            sortedBy: {
                key: "fqdns",
                dir: "asc"
            },
            rowExpansionTemplate: CPANEL.widgets.ssltable.detailsExpand
        }
    );

    ssl_datatable.subscribe("postRenderEvent", _attach_table_click_listeners);

    // Register startup events.
    YAHOO.util.Event.onDOMReady(load_table_data);

})(window);
