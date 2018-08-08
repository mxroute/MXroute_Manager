var NativeJson = Object.prototype.toString.call(this.JSON) === "[object JSON]" && this.JSON;

function fastJsonParse(s, reviver) {
    return NativeJson ?
        NativeJson.parse(s, reviver) : YAHOO.lang.JSON.parse(s, reviver);
}
function check_required(reqlist) {
    for (var reqfield in reqlist) {
        if (reqlist.hasOwnProperty(reqfield)) {
            if (document.getElementById(reqfield).value == "") {
                alert(reqlist[reqfield] + " must be filled in.");
                return false;
            }
        }
    }
    return true;
}
/* ***** BEGIN LICENSE BLOCK *****

# cpanel12 - CookieHelper.js                 Copyright(c) 1997-2008 cPanel, Inc.
#                                                           All Rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited

 * ***** END LICENSE BLOCK *****
  * ***** BEGIN APPLICABLE CODE BLOCK ***** */

/* Double Include Protection

if (CookieHelper) {
    alert("Cookie Helper Included multiple times in " + window.location.href);
}

var CookieHelper = 1;
 */

var isWebMail = 0;
var NVData_pending = 0;

function DidSetNvData(jsonRef, myCallback) {
    NVData_pending = 0;
    if (!jsonRef) {
        alert("Invalid json response from json-api: " + o.responseText);
        return;
    }

    for (var i = 0; i < jsonRef.length; i++) {
        if (jsonRef[i].set == null) {
            alert("Invalid Data in response from json-api: " + o.responseText);
            continue;
        }
        if (myCallback != null) {
            myCallback(jsonRef[i].set);
        }
    }
}

function FailSetNvData(o) {

    // DEBUG    alert("Unable to setNvData in: " + window.location.href);
}

function SetNvData(name, Cvalue, myCallback, nocache) {
    var mycallback = function(xmlRef) {
        DidSetNvData(xmlRef, myCallback);
    };

    if (typeof (window["cpanel_jsonapi2"]) == "undefined") {
        alert("You must load jsonapi.js before using SetNvData into this page: " + window.location.href);
    }
    cpanel_jsonapi2(mycallback, "NVData", "set", "names", name, name, Cvalue, "__nvdata::nocache", (nocache ? 1 : 0));
    NVData_pending = 1;
    NVData[name] = Cvalue;
}

function GotNvData(jsonRef, myCallback) {

    if (!jsonRef) {
        alert("Invalid json response from json-api NVData get");
        return;
    }
    if (!myCallback) {
        alert("GetNvData call is missing a callback function on: " + window.location.href);
        return;
    }

    for (var i = 0; i < jsonRef.length; i++) {
        if (!jsonRef[i].name) {
            alert("Invalid Data in response from NVData get");
            continue;
        }
        var thisVal = "";
        if (jsonRef[i].value) {
            thisVal = jsonRef[i].value;
        }
        myCallback(jsonRef[i].name, unescape(thisVal));
    }
}

function FailGetNvData(o) {

    // DEBUG    alert("Unable to getNvData in: " + window.location.href);
}

function GetNvData(name, myCallback) {
    var mycallback = function(xmlRef) {
        GotNvData(xmlRef, myCallback);
    };

    if (typeof (window["cpanel_jsonapi2"]) == "undefined") {
        alert("You must load jsonapi.js before using SetNvData into this page: " + window.location.href);
    }
    cpanel_jsonapi2(mycallback, "NVData", "get", "names", name);
}

function SetCookie(name, value, expires, path) {
    document.cookie = name + "=" + escape(value) +
        ((expires) ? ("; expires=" + expires.toGMTString()) : "") +
        ((path) ? ("; path=" + path) : "");
}

function GetCookie(name) {
    var dcookie = document.cookie;
    var cname = name + "=";
    var clen = dcookie.length;
    var cbegin = 0;
    while (cbegin < clen) {
        var vbegin = cbegin + cname.length;
        if (dcookie.substring(cbegin, vbegin) == cname) {
            var vend = dcookie.indexOf(";", vbegin);
            if (vend == -1) {
                vend = clen;
            }
            return unescape(dcookie.substring(vbegin, vend));
        }
        cbegin = dcookie.indexOf(" ", cbegin) + 1;
        if (cbegin == 0) {
            break;
        }
    }

    // alert("Cookie (Get):" + document.cookie);
    return null;
}

function include_dom(script_filename) {
    var html_doc = document.getElementsByTagName("head").item(0);
    var js = document.createElement("script");
    js.setAttribute("language", "javascript");
    js.setAttribute("type", "text/javascript");
    js.setAttribute("src", script_filename);
    html_doc.appendChild(js);
    return false;
}
/*
  SortTable
  version 2
  7th April 2007
  Stuart Langridge, http://www.kryogenix.org/code/browser/sorttable/

  Instructions:
  Download this file
  Add <script src="sorttable.js"></script> to your HTML
  Add class="sortable" to any table you'd like to make sortable
  Click on the headers to sort

  Thanks to many, many people for contributions and suggestions.
  Licenced as X11: http://www.kryogenix.org/code/browser/licence.html
  This basically means: do what you want with it.
*/


var stIsIE = 0;
if (navigator.appVersion.indexOf("MSIE") != -1) {
    stIsIE = 1;
}

sorttable = {
    init: function() {

    // quit if this function has already been called
        if (arguments.callee.done) {
            return;
        }

        // flag this function so we don't do the same thing twice
        arguments.callee.done = true;

        if (!document.createElement || !document.getElementsByTagName) {
            return;
        }

        sorttable.DATE_RE = /^(\d\d?)[\/\.-](\d\d?)[\/\.-]((\d\d)?\d\d)$/;

        forEach(document.getElementsByTagName("table"), function(table) {
            if (table.className.search(/\bsortable\b/) != -1) {
                var customMethodName = table.getAttribute("custom-sort-method");
                if (customMethodName) {
                    sorttable.makeSortable(table, customMethodName);
                } else {
                    sorttable.makeSortable(table);
                }
            }
        });

    },

    makeSortable: function(table, customClickHanderName) {
        if (table.getElementsByTagName("thead").length == 0) {

            // table doesn't have a tHead. Since it should have, create one and
            // put the first table row in it.
            the = document.createElement("thead");
            the.appendChild(table.rows[0]);
            table.insertBefore(the, table.firstChild);
        }

        // Safari doesn't support table.tHead, sigh
        if (table.tHead == null) {
            table.tHead = table.getElementsByTagName("thead")[0];
        }

        // if creating the table head made an empty tbody element nuke it
        var tBody = table.getElementsByTagName("tbody");
        if (tBody.length > 1) {
            var is_empty = 1;
            for (var i = 0; i < tBody[0].childNodes.length; i++) {
                if (tBody[0].childNodes[i].nodeType != 3) {
                    is_empty = 0;
                    break;
                }
            }
            if (is_empty) {
                table.removeChild(tBody[0]);
            }
        }

        if (table.tHead.rows.length != 1) {
            return;
        } // can't cope with two header rows
        // Sorttable v1 put rows with a class of "sortbottom" at the bottom (as
        // "total" rows, for example). This is B&R, since what you're supposed
        // to do is put them in a tfoot. So, if there are sortbottom rows,
        // for backwards compatibility, move them to tfoot (creating it if needed).
        sortbottomrows = [];
        for (var i = 0; i < table.rows.length; i++) {
            if (table.rows[i].className.search(/\bsortbottom\b/) != -1) {
                sortbottomrows[sortbottomrows.length] = table.rows[i];
            }
        }
        if (sortbottomrows) {
            if (table.tFoot == null) {

                // table doesn't have a tfoot. Create one.
                tfo = document.createElement("tfoot");
                table.appendChild(tfo);
            }
            for (var i = 0; i < sortbottomrows.length; i++) {
                tfo.appendChild(sortbottomrows[i]);
            }
            delete sortbottomrows;
        }

        // work through each column and calculate its type
        headrow = table.tHead.rows[0].cells;
        for (var i = 0; i < headrow.length; i++) {

            // manually override the type with a sorttable_type attribute
            if (!headrow[i].className.match(/\bsorttable_nosort\b/) &&
          !( headrow[i].getAttribute("nonsortable") != null && headrow[i].getAttribute("nonsortable").length > 0 )  ) {
                mtch = headrow[i].className.match(/\bsorttable_([a-z0-9]+)\b/);
                if (mtch) {
                    override = mtch[1];
                }
                if (mtch && typeof sorttable["sort_" + override] == "function") {
                    headrow[i].sorttable_sortfunction = sorttable["sort_" + override];
                } else {
                    headrow[i].sorttable_sortfunction = sorttable.guessType(table, i);
                }

                // make it clickable to sort
                headrow[i].sorttable_columnindex = i;
                headrow[i].sorttable_tbody = table.tBodies[0];

                headrow[i].className += " clickable";
                sorttable.initializeHeader(headrow[i]);

                // Build the sort handler
                dean_addEvent(headrow[i], "click", function(e) {

                    var customClickHandler = null;
                    if (customClickHanderName) {
                        customClickHandler = window[customClickHanderName];
                    }

                    if (this.className.search(/\bsorttable_sorted\b/) != -1) {

                        // if we're already sorted by this column, just
                        // reverse the table, which is quicker
                        if (!customClickHanderName) {
                            sorttable.reverse(this.sorttable_tbody);
                        }
                        this.className = this.className.replace("sorttable_sorted",
                            "sorttable_sorted_reverse");
                        this.removeChild(document.getElementById("sorttable_sortfwdind"));
                        sortrevind = document.createElement("span");
                        sortrevind.id = "sorttable_sortrevind";
                        sortrevind.className = "sortable_reverse";
                        sortrevind.innerHTML = stIsIE ? '&nbsp<font face="webdings">5</font>' : "&nbsp;&#x25B4;";
                        this.appendChild(sortrevind);
                        if (customClickHandler) {

                            // Normalize the event for ie.
                            if (!e.currentTarget) {
                                e.currentTarget = this;
                            }
                            customClickHandler(e);
                        }
                        return;
                    }

                    if (this.className.search(/\bsorttable_sorted_reverse\b/) != -1) {

                        // if we're already sorted by this column in reverse, just
                        // re-reverse the table, which is quicker
                        if (!customClickHanderName) {
                            sorttable.reverse(this.sorttable_tbody);
                        }
                        this.className = this.className.replace("sorttable_sorted_reverse",
                            "sorttable_sorted");
                        this.removeChild(document.getElementById("sorttable_sortrevind"));
                        sortfwdind = document.createElement("span");
                        sortfwdind.id = "sorttable_sortfwdind";
                        sortfwdind.className = "sortable_forward";
                        sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : "&nbsp;&#x25BE;";
                        this.appendChild(sortfwdind);
                        if (customClickHandler) {

                            // Normalize the event for ie.
                            if (!e.currentTarget) {
                                e.currentTarget = this;
                            }
                            customClickHandler(e);
                        }
                        return;
                    }

                    // remove sorttable_sorted classes
                    theadrow = this.parentNode;
                    forEach(theadrow.childNodes, function(cell) {
                        if (cell.nodeType == 1) { // an element
                            cell.className = cell.className.replace("sorttable_sorted_reverse", "");
                            cell.className = cell.className.replace("sorttable_sorted", "");
                        }
                    });

                    sortfwdind = document.getElementById("sorttable_sortfwdind");
                    if (sortfwdind) {
                        sortfwdind.parentNode.removeChild(sortfwdind);
                    }
                    sortrevind = document.getElementById("sorttable_sortrevind");
                    if (sortrevind) {
                        sortrevind.parentNode.removeChild(sortrevind);
                    }

                    // Customize the initial direction for this column.
                    var isDefaultReverse = this.getAttribute("sortable-default-reverse") === "1";
                    if (!isDefaultReverse) {
                        this.className += " sorttable_sorted";
                        sortfwdind = document.createElement("span");
                        sortfwdind.id = "sorttable_sortfwdind";
                        sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : "&nbsp;&#x25BE;";
                        this.appendChild(sortfwdind);
                    } else {
                        this.className += " sorttable_sorted_reverse";
                        sortrevind = document.createElement("span");
                        sortrevind.id = "sorttable_sortrevind";
                        sortrevind.className = "sortable_reverse";
                        sortrevind.innerHTML = stIsIE ? '&nbsp<font face="webdings">5</font>' : "&nbsp;&#x25B4;";
                        this.appendChild(sortrevind);
                    }


                    if (customClickHandler) {

                        // Normalize the event for ie.
                        if (!e.currentTarget) {
                            e.currentTarget = this;
                        }

                        // Rely on this method to trigger sorting, client or server
                        customClickHandler(e);
                    } else { // Do the client sorting

                        // build an array to sort. This is a Schwartzian transform thing,
                        // i.e., we "decorate" each row with the actual sort key,
                        // sort based on the sort keys, and then put the rows back in order
                        // which is a lot faster because you only do getInnerText once per row
                        row_array = [];
                        col = this.sorttable_columnindex;
                        rows = this.sorttable_tbody.rows;
                        for (var j = 0; j < rows.length; j++) {
                            row_array[row_array.length] = [sorttable.getInnerText(rows[j].cells[col]), rows[j]];
                        }
                        row_array.sort(this.sorttable_sortfunction);

                        // sorttable.shaker_sort(row_array, this.sorttable_sortfunction);
                        tb = this.sorttable_tbody;
                        for (var j = 0; j < row_array.length; j++) {
                            var new_class, other_class;
                            if ((j % 2) == 0) {
                                new_class = "info-even";
                                other_class = "info-odd";
                            } else {
                                new_class = "info-odd";
                                other_class = "info-even";
                            }

                            var row_class = row_array[j][1].className;
                            row_class = row_class.replace(other_class, new_class).replace(/^\s+|\s+$/, "").replace(/\s+/, " ");
                            row_array[j][1].className = row_class;

                            tb.appendChild(row_array[j][1]);
                        }

                        delete row_array;
                    }
                });
            }
        }
    },

    initializeHeader: function(current) {
        if (current.className.search(/\bsorttable_sorted\b/) != -1) {
            sortfwdind = document.createElement("span");
            sortfwdind.id = "sorttable_sortfwdind";
            sortfwdind.className = "sortable_forward";
            sortfwdind.innerHTML = stIsIE ? '&nbsp<font face="webdings">6</font>' : "&nbsp;&#x25BE;";
            current.appendChild(sortfwdind);
        }

        if (current.className.search(/\bsorttable_sorted_reverse\b/) != -1) {
            sortrevind = document.createElement("span");
            sortrevind.id = "sorttable_sortrevind";
            sortrevind.className = "sortable_reverse";
            sortrevind.innerHTML = stIsIE ? '&nbsp<font face="webdings">5</font>' : "&nbsp;&#x25B4;";
            current.appendChild(sortrevind);
        }
    },

    guessType: function(table, column) {

    // guess the type of a column based on its first non-blank row
        sortfn = sorttable.sort_alpha;
        if (!table.tBodies[0]) {
            return sortfn;
        }
        for (var i = 0; i < table.tBodies[0].rows.length; i++) {
            text = sorttable.getInnerText(table.tBodies[0].rows[i].cells[column]);
            if (text != "") {
                if (text.match(/^-?[�$�]?[\d,.]+%?\s(Bytes|KB|MB|GB|TB|PB)$/)) {
                    return sorttable.sort_space;
                }

                if (text.match(/^-?[�$�]?[\d,.]+%?$/)) {
                    return sorttable.sort_numeric;
                }

                // check for a date: dd/mm/yyyy or dd/mm/yy
                // can have / or . or - as separator
                // can be mm/dd as well
                possdate = text.match(sorttable.DATE_RE);
                if (possdate) {

                    // looks like a date
                    first = parseInt(possdate[1]);
                    second = parseInt(possdate[2]);
                    if (first > 12) {

                        // definitely dd/mm
                        return sorttable.sort_ddmm;
                    } else if (second > 12) {
                        return sorttable.sort_mmdd;
                    } else {

                        // looks like a date, but we can't tell which, so assume
                        // that it's dd/mm (English imperialism!) and keep looking
                        sortfn = sorttable.sort_ddmm;
                    }
                }
            }
        }
        return sortfn;
    },

    getInnerText: function(node) {

    // gets the text we want to use for sorting for a cell.
    // strips leading and trailing whitespace.
    // this is *not* a generic getInnerText function; it's special to sorttable.
    // for example, you can override the cell text with a customkey attribute.
    // it also gets .value for <input> fields.

        if (!node) {
            return "";
        }

        hasInputs = (typeof node.getElementsByTagName == "function") &&
                 node.getElementsByTagName("input").length;

        if (node.nodeType != 3 && node.getAttribute("sorttable_customkey") != null) {
            return node.getAttribute("sorttable_customkey");
        } else if (typeof node.textContent != "undefined" && !hasInputs) {
            return node.textContent.replace(/^\s+|\s+$/g, "");
        } else if (typeof node.innerText != "undefined" && !hasInputs) {
            return node.innerText.replace(/^\s+|\s+$/g, "");
        } else if (typeof node.text != "undefined" && !hasInputs) {
            return node.text.replace(/^\s+|\s+$/g, "");
        } else {
            switch (node.nodeType) {
                case 3:
                    if (node.nodeName.toLowerCase() == "input") {
                        return node.value.replace(/^\s+|\s+$/g, "");
                    }
                case 4:
                    return node.nodeValue.replace(/^\s+|\s+$/g, "");
                    break;
                case 1:
                case 11:
                    var innerText = "";
                    for (var i = 0; i < node.childNodes.length; i++) {
                        innerText += sorttable.getInnerText(node.childNodes[i]);
                    }
                    return innerText.replace(/^\s+|\s+$/g, "");
                    break;
                default:
                    return "";
            }
        }
    },

    reverse: function(tbody) {

    // reverse the rows in a tbody
        newrows = [];
        for (var i = 0; i < tbody.rows.length; i++) {
            newrows[newrows.length] = tbody.rows[i];
        }
        for (var i = newrows.length - 1; i >= 0; i--) {
            tbody.appendChild(newrows[i]);
        }
        delete newrows;
    },

    /* sort functions
     each sort function takes two parameters, a and b
     you are comparing a[0] and b[0] */
    sort_space: function(a, b) {
        abytesunit = a[0].split(/\s+/);
        aa = unit_to_bytes(abytesunit[0], abytesunit[1]);
        if (isNaN(aa)) {
            aa = 0;
        }
        bbytesunit = b[0].split(/\s+/);
        bb = unit_to_bytes(bbytesunit[0], bbytesunit[1]);
        if (isNaN(bb)) {
            bb = 0;
        }
        return aa - bb;
    },
    sort_numeric: function(a, b) {
        aa = parseFloat(a[0].replace(/[^0-9.-]/g, ""));
        if (isNaN(aa)) {
            aa = 0;
        }
        bb = parseFloat(b[0].replace(/[^0-9.-]/g, ""));
        if (isNaN(bb)) {
            bb = 0;
        }
        return aa - bb;
    },
    sort_alpha: function(a, b) {
        if (a[0] == b[0]) {
            return 0;
        }
        if (a[0] < b[0]) {
            return -1;
        }
        return 1;
    },
    sort_ddmm: function(a, b) {
        mtch = a[0].match(sorttable.DATE_RE);
        y = mtch[3]; m = mtch[2]; d = mtch[1];
        if (m.length == 1) {
            m = "0" + m;
        }
        if (d.length == 1) {
            d = "0" + d;
        }
        dt1 = y + m + d;
        mtch = b[0].match(sorttable.DATE_RE);
        y = mtch[3]; m = mtch[2]; d = mtch[1];
        if (m.length == 1) {
            m = "0" + m;
        }
        if (d.length == 1) {
            d = "0" + d;
        }
        dt2 = y + m + d;
        if (dt1 == dt2) {
            return 0;
        }
        if (dt1 < dt2) {
            return -1;
        }
        return 1;
    },
    sort_mmdd: function(a, b) {
        mtch = a[0].match(sorttable.DATE_RE);
        y = mtch[3]; d = mtch[2]; m = mtch[1];
        if (m.length == 1) {
            m = "0" + m;
        }
        if (d.length == 1) {
            d = "0" + d;
        }
        dt1 = y + m + d;
        mtch = b[0].match(sorttable.DATE_RE);
        y = mtch[3]; d = mtch[2]; m = mtch[1];
        if (m.length == 1) {
            m = "0" + m;
        }
        if (d.length == 1) {
            d = "0" + d;
        }
        dt2 = y + m + d;
        if (dt1 == dt2) {
            return 0;
        }
        if (dt1 < dt2) {
            return -1;
        }
        return 1;
    },
    shaker_sort: function(list, comp_func) {

    // A stable sort function to allow multi-level sorting of data
    // see: http://en.wikipedia.org/wiki/Cocktail_sort
    // thanks to Joseph Nahmias
        var b = 0;
        var t = list.length - 1;
        var swap = true;

        while (swap) {
            swap = false;
            for (var i = b; i < t; ++i) {
                if ( comp_func(list[i], list[i + 1]) > 0 ) {
                    var q = list[i]; list[i] = list[i + 1]; list[i + 1] = q;
                    swap = true;
                }
            } // for
            t--;

            if (!swap) {
                break;
            }

            for (var i = t; i > b; --i) {
                if ( comp_func(list[i], list[i - 1]) < 0 ) {
                    var q = list[i]; list[i] = list[i - 1]; list[i - 1] = q;
                    swap = true;
                }
            } // for
            b++;

        } // while(swap)
    }
};

/* ******************************************************************
   Supporting functions: bundled here to avoid depending on a library
   ****************************************************************** */

YAHOO.util.Event.onDOMReady(sorttable.init);

// written by Dean Edwards, 2005
// with input from Tino Zijdel, Matthias Miller, Diego Perini

// http://dean.edwards.name/weblog/2005/10/add-event/

function dean_addEvent(element, type, handler) {
    if (element.addEventListener) {
        element.addEventListener(type, handler, false);
    } else {

        // assign each event handler a unique ID
        if (!handler.$$guid) {
            handler.$$guid = dean_addEvent.guid++;
        }

        // create a hash table of event types for the element
        if (!element.events) {
            element.events = {};
        }

        // create a hash table of event handlers for each element/event pair
        var handlers = element.events[type];
        if (!handlers) {
            handlers = element.events[type] = {};

            // store the existing event handler (if there is one)
            if (element["on" + type]) {
                handlers[0] = element["on" + type];
            }
        }

        // store the event handler in the hash table
        handlers[handler.$$guid] = handler;

        // assign a global event handler to do all the work
        element["on" + type] = handleEvent;
    }
};

// a counter used to create unique IDs
dean_addEvent.guid = 1;

function removeEvent(element, type, handler) {
    if (element.removeEventListener) {
        element.removeEventListener(type, handler, false);
    } else {

        // delete the event handler from the hash table
        if (element.events && element.events[type]) {
            delete element.events[type][handler.$$guid];
        }
    }
};

function handleEvent(event) {
    var returnValue = true;

    // grab the event object (IE uses a global event object)
    event = event || fixEvent(((this.ownerDocument || this.document || this).parentWindow || window).event);

    // get a reference to the hash table of event handlers
    var handlers = this.events[event.type];

    // execute each event handler
    for (var i in handlers) {
        this.$$handleEvent = handlers[i];
        if (this.$$handleEvent(event) === false) {
            returnValue = false;
        }
    }
    return returnValue;
};

function fixEvent(event) {

    // add W3C standard event methods
    event.preventDefault = fixEvent.preventDefault;
    event.stopPropagation = fixEvent.stopPropagation;
    return event;
};
fixEvent.preventDefault = function() {
    this.returnValue = false;
};
fixEvent.stopPropagation = function() {
    this.cancelBubble = true;
};

// Dean's forEach: http://dean.edwards.name/base/forEach.js
/*
    forEach, version 1.0
    Copyright 2006, Dean Edwards
    License: http://www.opensource.org/licenses/mit-license.php
*/

// array-like enumeration
if (!Array.forEach) { // mozilla already supports this
    Array.forEach = function(array, block, context) {
        for (var i = 0; i < array.length; i++) {
            block.call(context, array[i], i, array);
        }
    };
}

// generic enumeration
Function.prototype.forEach = function(object, block, context) {
    for (var key in object) {
        if (typeof this.prototype[key] == "undefined") {
            block.call(context, object[key], key, object);
        }
    }
};

// character enumeration
String.forEach = function(string, block, context) {
    Array.forEach(string.split(""), function(chr, index) {
        block.call(context, chr, index, string);
    });
};

// globally resolve forEach enumeration
var forEach = function(object, block, context) {
    if (object) {
        var resolve = Object; // default
        if (object instanceof Function) {

            // functions have a "length" property
            resolve = Function;
        } else if (object.forEach instanceof Function) {

            // the object implements a custom forEach method so use that
            object.forEach(block, context);
            return;
        } else if (typeof object == "string") {

            // the object is a string
            resolve = String;
        } else if (typeof object.length == "number") {

            // the object is array-like
            resolve = Array;
        }
        resolve.forEach(object, block, context);
    }
};

function unit_to_bytes(num, bytes) {
    switch (bytes) {
        case "KB":
            return parseFloat(num) * 1024;
        case "MB":
            return parseFloat(num) * 1024 * 1024;
        case "GB":
            return parseFloat(num) * 1024 * 1024 * 1024;
        case "TB":
            return parseFloat(num) * 1024 * 1024 * 1024 * 1024;
        case "PB":
            return parseFloat(num) * 1024 * 1024 * 1024 * 1024 * 1024;
        default:
            return parseFloat(num);
    }
}
/* ***** BEGIN LICENSE BLOCK *****

# cpanel12 - xmlapi.js                       Copyright(c) 1997-2008 cPanel, Inc.
#                                                           All Rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited

 * ***** END LICENSE BLOCK *****
  * ***** BEGIN APPLICABLE CODE BLOCK ***** */
var use_fast_proto = 1;

function cpanel_api1() {
    var argv = cpanel_api1.arguments;
    var mycallback = argv[0];
    var module = argv[1];
    var func = argv[2];
    var argc = argv.length;

    var callback = {
        success: cpanel_api1_parser,
        argument: mycallback
    };

    var sFormData;
    if (use_fast_proto) {
        sFormData = "cpanel_xmlapi_module=" + encodeURIComponent(module) + "&cpanel_xmlapi_func=" + encodeURIComponent(func) + "&cpanel_xmlapi_apiversion=1";
        var argnum = 0;
        for (var i = 3; i < argc; i++) {
            sFormData += "&arg-" + argnum + "=" + encodeURIComponent(argv[i]);
            argnum++;
        }
    } else {
        sFormData = "xmlin=<cpanelaction><apiversion>1</apiversion><module>" + module + "</module><func>" + func + "</func>";
        for (var i = 3; i < argc; i++) {
            sFormData += "<args>" + argv[i] + "</args>";
        }
        sFormData += "</cpanelaction>";
    }
    if (sFormData.length < 2000) {
        YAHOO.util.Connect.asyncRequest("GET", CPANEL.security_token + "/xml-api/cpanel?" + sFormData, callback);
    } else {
        YAHOO.util.Connect.asyncRequest("POST", CPANEL.security_token + "/xml-api/cpanel", callback, sFormData);
    }
}

function cpanel_api1_parser(o) {
    var mycallback = o.argument;
    var rootNode = o.responseXML;
    var cpanelresultEl = rootNode.getElementsByTagName("cpanelresult")[0];
    var cpaneldataEl = cpanelresultEl.getElementsByTagName("data")[0];
    var dataresultEl = cpaneldataEl.getElementsByTagName("result")[0];

    var parsed_data;
    if (dataresultEl.firstChild) {
        parsed_data = dataresultEl.firstChild.nodeValue;
    }
    if (mycallback) {
        mycallback(parsed_data);
    }
}

function cpanel_api2() {
    var argv = cpanel_api2.arguments;
    var mycallback = argv[0];
    var module = argv[1];
    var func = argv[2];
    var argc = argv.length;

    var callback = {
        success: cpanel_api2_parser,
        argument: mycallback
    };

    var sFormData;
    if (use_fast_proto) {
        sFormData = "cpanel_xmlapi_module=" + encodeURIComponent(module) + "&cpanel_xmlapi_func=" + encodeURIComponent(func) + "&cpanel_xmlapi_apiversion=2";
        for (var i = 3; i < argc; i += 2) {
            sFormData += "&" + encodeURIComponent(argv[i]) + "=" + encodeURIComponent(argv[i + 1]);
        }
    } else {
        sFormData = "xmlin=<cpanelaction><apiversion>2</apiversion><module>" + module + "</module><func>" + func + "</func><args>";
        for (var i = 3; i < argc; i += 2) {
            sFormData += "<" + argv[i] + ">" + argv[i + 1] + "</" + argv[i] + ">";
        }
        sFormData += "</args></cpanelaction>";
    }
    if (sFormData.length < 2000) {
        YAHOO.util.Connect.asyncRequest("GET", CPANEL.security_token + "/xml-api/cpanel?" + sFormData, callback);
    } else {
        YAHOO.util.Connect.asyncRequest("POST", CPANEL.security_token + "/xml-api/cpanel", callback, sFormData);
    }
}

function cpanel_api2_parser(o) {
    var mycallback = o.argument;
    var rootNode = o.responseXML;
    var cpanelresultEl = rootNode.getElementsByTagName("cpanelresult")[0];
    var cpaneldataEl = cpanelresultEl.getElementsByTagName("data");

    if (mycallback) {
        mycallback(cpaneldataEl);
    }
}
/* ***** BEGIN LICENSE BLOCK *****

# cpanel12 - jsonapi.js                       Copyright(c) 1997-2009 cPanel, Inc.
#                                                           All Rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited

 * ***** END LICENSE BLOCK *****
  * ***** BEGIN APPLICABLE CODE BLOCK ***** */

function cpanel_jsonapi1() {
    var argv = cpanel_jsonapi1.arguments;
    var mycallback = argv[0];
    var module = argv[1];
    var func = argv[2];
    var argc = argv.length;

    var callback = {
        success: cpanel_jsonapi1_parser,
        failure: mycallback,
        argument: mycallback
    };

    var sFormData = "cpanel_jsonapi_module=" + encodeURIComponent(module) + "&cpanel_jsonapi_func=" + encodeURIComponent(func) + "&cpanel_jsonapi_apiversion=1";
    var argnum = 0;
    for (var i = 3; i < argc; i++) {
        sFormData += "&arg-" + argnum + "=" + encodeURIComponent(argv[i]);
        argnum++;
    }
    if (sFormData.length < 2000) {
        YAHOO.util.Connect.asyncRequest("GET", CPANEL.security_token + "/json-api/cpanel?" + sFormData, callback);
    } else {
        YAHOO.util.Connect.asyncRequest("POST", CPANEL.security_token + "/json-api/cpanel", callback, sFormData);
    }
}

function cpanel_jsonapi1_parser(o) {
    var mycallback = o.argument;
    var jsonCode = fastJsonParse(o.responseText);
    if (mycallback) {
        mycallback(jsonCode.cpanelresult.data.result);
    }
}

function cpanel_jsonapi2() {
    var argv = cpanel_jsonapi2.arguments;
    var mycallback = argv[0];
    var module = argv[1];
    var func = argv[2];
    var argc = argv.length;

    var callback = {
        success: cpanel_jsonapi2_parser,
        failure: mycallback,
        argument: mycallback
    };

    var sFormData = "cpanel_jsonapi_module=" + encodeURIComponent(module) + "&cpanel_jsonapi_func=" + encodeURIComponent(func) + "&cpanel_jsonapi_apiversion=2";
    for (var i = 3; i < argc; i += 2) {
        sFormData += "&" + encodeURIComponent(argv[i]) + "=" + encodeURIComponent(argv[i + 1]);
    }
    if (sFormData.length < 2000) {
        YAHOO.util.Connect.asyncRequest("GET", CPANEL.security_token + "/json-api/cpanel?" + sFormData, callback);
    } else {
        YAHOO.util.Connect.asyncRequest("POST", CPANEL.security_token + "/json-api/cpanel", callback, sFormData);
    }
}

function cpanel_jsonapi2_parser(o) {
    var mycallback = o.argument;
    var jsonCode = fastJsonParse(o.responseText);
    if (mycallback) {
        mycallback(jsonCode.cpanelresult.data);
    }
}
var validate_data_panel_initted = 0;
var validate_data_panel;
var realtime_validate_inited = {};
var cached_url_depth;
var validate_working_form;
var valImgs = [];
var validateElMap = {};
var check_elements = {};
var match_validators = {

    /* email validations */
    "fullemailaddress": eval("/^([a-zA-Z0-9\_\'\+\*\$\%\^\&\!\.\-])+[\@\+](([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9:]{2,4})+$/"),
    "emailcharplus": eval("/^([a-zA-Z0-9\_\'\+.\-])/"),
    "emailaddress": /^[^\@]\@[^\.]\./,
    "emailchars": /^[a-z0-9\_\-\@\.]+$/,
    /* http://www.remote.org/jochen/mail/info/chars.html*/ "email_localpart_chars": /^\w[\w-.+%]*/,
    /* C. Oakman - changed this to match our backend validation script */ "email_localpart_chars_cap": /^[A-Za-z0-9\_\-\.]+$/,
    /* http://www.remote.org/jochen/mail/info/chars.html*/ "atsign": /\@/,
    "notestsign": /\@/,

    /* hosts, domains and ip addresses */
    "hostname": /^((\*\.|[a-zA-Z0-9])([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/,
    "fqdn_domain": /^((\*\.|[a-zA-Z0-9])([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.){2}[a-zA-Z]{2,6}$/,
    "fullipaddr": /^(\d{1,3}\.){3}\d{1,3}$/,
    "is_ipcidr_or_host": /^[a-z0-9\.\-\/]+$/,
    "ipcidr": /^\d+\.\d+\.\d+\.\d+\/?\d*$/,
    "host": /^[\w\.\-]+$/,
    "wildhost": /^[\*\w\.\-]+$/,
    "wildhostsql": /^[\%\w\.\-]+$/,

    /* number */
    "unlimitedornum": /^[0-9]*$|^unlimited$/,
    "numeric": /^[0-9]+$/,
    "decimal_numeric": /^[-+]?[0-9]+(\.[0-9]+)?$/,
    "decimal_numeric_unlimited": /^[-+]?[0-9]+(\.[0-9]+)?$|^unlimited$/,

    /* alpha */
    "alphanum": /^[a-z0-9\_\-]+$/i,

    /* web validations */
    "start_www.": /^www[.]/i,

    /* files */
    "jpg_gif_png_jpeg": /\.(gif|jpg|png|jpeg)$/,
    "html": /\.(html)$/,

    /* misc */
    "spaces_dots_ats_fwdslashes_hyphens": /[\s\.\@\/\-]/,
    "spaces_dots_ats_fwdslashes": /[\s\.\@\/]+/,
    "two_dots": /[^\.]\.[^\.]\.[^\.]/,
    "spaces_ats_fwdslashes": /[\s\@\/]+/,
    "start_end_dashes": /(?:^[-]|[-]$)/,
    "start_end_space": /(?:^[\s]|[\s]$)/,
    "slashes_dots": /[\.\/\\]/,
    "noascii0_255": /[\0\255]/,
    "spaces": /\s+/,
    "forwardslash": /\//,
    "dot": /\./,
    "empty": /^$/,
    "start_end_dots": /(^[.]|[.]$)/,
    "start_dot": /^\./,
    "underscore": /\_/,
    "protocol": /^\S+[:][/][/]/,
    "only_spaces": /^\s+$/,

    /* TLS */
    "ssl_chars": /^[\-\w\!\+\@\~\:]+$/,

    /* Dovecot, Courier, and FTP Config values */
    "whole_nums": /^\d+$/,
    "1_9only": /^[1-9]$/
};


var offsetQuirk = 0;
if (navigator.appVersion.indexOf("MSIE") != -1 || navigator.appVersion.indexOf("Opera") != -1) {
    offsetQuirk = 1;
}


var validgen = 0;


var validateFocusEl;


var validators = {};

var newest_listener;

/*

register_validator('FORMID','nomatch','empty',[document.mainform.password],"A password must be specified.");
register_validator('FORMID','nomatch','spaces',[document.mainform.email],"Sorry, the username cannot contain any spaces.");
register_validator('FORMID','nomatch','atsign',[document.mainform.email],"Sorry, the username cannot contain an @ sign.");
register_validator('FORMID','nomatch','forwardslash',[document.mainform.email],"Sorry, the username cannot contain a forward slash .");
register_validator('FORMID','match','unlimitedornum',[document.mainform.quota],"Sorry, quota must be a number or unlimited.");
register_validator('FORMID','Eleq','',[document.mainform.password,document.mainform.password2],"The passwords don't match. please retry.");
*/

function password_strength_validator_init() {
    if (!self["passkey_handler"]) {

        alert("Javascript Order Error.  You cannot call password_strength_validator_init before passkey_handler has been loaded.");
        return;

    }

    passkey_handler();
    hide_password_tip_panel();
}

function init_validate_dialog() {
    if (validate_data_panel_initted) {
        return;
    }

    validate_data_panel_initted = 1;

    if (!document.getElementById("validate_data_panel")) {
        var newpanel = document.createElement("div");
        newpanel.id = "validate_data_panel";
        newpanel.style.display = "none";
        newpanel.innerHTML = '<div class="hd"><div class="lt"></div><span>Inputs not Valid!</span><div class="rt"></div></div><div class="bd"><div id="inputs_val" style="padding: 30px;"></div></div>';
        document.body.appendChild(newpanel);
    }
    validate_data_panel =
        new YAHOO.widget.Dialog("validate_data_panel", {
            width: "300px",
            fixedcenter: true,
            constraintoviewport: true,
            close: true,
            draggable: false,
            modal: false,
            buttons: [{
                text: "Close",
                handler: function() {
                    validate_data_panel.hide();
                },
                isDefault: true
            }],

            visible: false
        });
    validate_data_panel.beforeHideEvent.subscribe(handle_hide_validate, validate_data_panel, true);


    validate_data_panel.render();

    validate_data_panel.hide();
    document.getElementById("validate_data_panel").style.display = "";
}

var handle_hide_validate = function() {
    if (validateFocusEl) {
        validateFocusEl.focus();
    }
};

function realtime_validate_init(formId) {
    if (!formId) {
        alert("realtime_validate_init must be called with a formId");
        return;
    }
    if (realtime_validate_inited[formId]) {
        return;
    }
    realtime_validate_inited[formId] = 1;

    YAHOO.util.Event.addListener(window, "resize", reposition_all_validator_imgs);

    if (!validators[formId]) {
        alert("No validators registerd for that formId: " + formId);
        return;
    }

    for (var i = 0; i < validators[formId].length; i++) {
        var Els = validators[formId][i].Els;
        for (var j = 0; j < Els.length; j++) {
            if (!Els[j].id) {
                Els[j].id = "validgen" + validgen++;
            }
            validateElMap[Els[j].id] = formId;
        }
    }

    for (var elId in validateElMap) {
        var thisEl = document.getElementById(elId);

        if (thisEl.tagName == "TEXTAREA" || thisEl.type == "text" || thisEl.type == "password" || thisEl.type == "textbox") {
            YAHOO.util.Event.addListener(thisEl, "keyup", function() {
                single_validate(this.id);
            }, thisEl, true);
        } else if (thisEl.tagName == "SELECT" || thisEl.type == "file") {
            YAHOO.util.Event.addListener(thisEl, "change", function() {
                single_validate(this.id);
            }, thisEl, true);
        }
    }
}

function single_validate(ElId, formId) {
    if (!formId) {
        formId = validateElMap[ElId];
    }
    if (!formId) {
        formId = document.getElementById(ElId).form.id;
    }
    do_validate(formId, 1, 0, ElId);
}

function validate_box(ElId, formId) {
    if (!formId) {
        formId = validateElMap[ElId];
    }
    if (!formId) {
        formId = document.getElementById(ElId).form.id;
    }
    do_validate(formId, 0, 1, ElId);
}

function do_validate(formId, noalert, noupdate, check_element) {
    var form_valid = 1;

    if (!formId) {
        alert("do_validate requires at least one argument (formId)");
        return false;
    }

    var alerts = [];
    var element_statuses = {};

    var formValidators = validators[formId] || [];

    validateFocusEl = 0;
    if (check_element && check_element != "" && check_elements[check_element] == null) {
        check_elements[check_element] = {};
        for (var i = 0; i < formValidators.length; i++) {
            var add_elements = 0;
            for (var ei = 0; ei < formValidators[i].Els.length; ei++) {
                if (formValidators[i].Els[ei].id == check_element) {
                    add_elements = 1;
                    break;
                }
            }
            if (add_elements) {
                for (var ei = 0; ei < formValidators[i].Els.length; ei++) {
                    check_elements[check_element][formValidators[i].Els[ei].id] = 1;
                }
            }
        }
    }

    for (var i = 0; i < formValidators.length; i++) {
        var currentValidator = formValidators[i];

        if (currentValidator.required) {
            if (!currentValidator.required()) {
                for (var ei = 0; ei < currentValidator.Els.length; ei++) {
                    setup_accept_image(currentValidator.Els[ei].id, 2);
                    YAHOO.util.Dom.removeClass(currentValidator.Els[ei], "formverifyfailed");
                }
                continue;
            }
        }

        if (check_element && check_element != "") {
            var affects_this = 0;
            for (var ei = 0; ei < currentValidator.Els.length; ei++) {
                if (check_elements[check_element][currentValidator.Els[ei].id]) {
                    affects_this = 1;
                }
            }
            if (!affects_this) {
                continue;
            }
        }
        var is_valid = 1;
        var els = currentValidator.Els[0];
        switch (currentValidator.method) {
            case "match":
                var matchkey = (typeof (currentValidator.vkey) == "string" ? match_validators[currentValidator.vkey] : currentValidator.vkey);
                if (matchkey == null) {
                    alert("Unknown regex key used for match: " + currentValidator.vkey + ". Valid keys are: " + validate_listmatchers());
                }
                if (!currentValidator.Els[0].value.match(matchkey)) {
                    is_valid = 0;
                }
                break;
            case "nomatch":
                var matchkey = (typeof (currentValidator.vkey) == "string" ? match_validators[currentValidator.vkey] : currentValidator.vkey);
                if (matchkey == null) {
                    alert("Unknown regex key used for match: " + currentValidator.vkey + ". Valid keys are: " + validate_listmatchers());
                }

                if (currentValidator.method == "match") { /* match*/
                    if (!els.value.match(matchkey)) {
                        is_valid = 0;
                    }
                } else { /* no match*/
                    if (els.value.match(matchkey)) {
                        is_valid = 0;
                    }
                }
                break;
            case "noeqtxt":
                if (els.value == currentValidator.vkey) {
                    is_valid = 0;
                }
                break;
            case "minlength":
                if (els.value.length < currentValidator.vkey) {
                    is_valid = 0;
                }
                break;
            case "maxlength":
                if (els.value.length > currentValidator.vkey) {
                    is_valid = 0;
                }
                break;
            case "NotEleq":
                if (els.value == currentValidator.Els[1].value) {
                    is_valid = 0;
                }
                break;
            case "Eleq":
                if (els.value != currentValidator.Els[1].value) {
                    is_valid = 0;
                }
                break;
            case "func":
                var myfunc = currentValidator.vkey;
                if (!myfunc(currentValidator.Els)) {
                    is_valid = 0;
                }
                break;
            default:
                alert("Unknown validator: " + currentValidator.method);
                form_valid = 0;
                make_elements_valid_status(currentValidator.Els, 0, element_statuses);
        }
        if (!is_valid) {
            if (!currentValidator.msg || currentValidator.msg.match(/^\s*$/)) {
                alert("Missing validation message for validator: " + currentValidator.method + " key: " + currentValidator.vkey);
            }
            alerts.push(currentValidator.msg);
            if (!validateFocusEl) {
                validateFocusEl = currentValidator.Els[0];
            }
            make_elements_valid_status(currentValidator.Els, 0, element_statuses);
            form_valid = 0;
        } else {
            make_elements_valid_status(currentValidator.Els, 1, element_statuses);
        }
    }

    if (!noupdate) {
        apply_elements_status(element_statuses);
    }

    if (!noalert && alerts.length) {
        init_validate_dialog();

        //	validate_data_panel.setHeader("Inputs not Valid!");
        var formatted_alerts = [];
        for (var i = 0; i < alerts.length; i++) {
            formatted_alerts.push('<p class="validation_msg">' + alerts[i] + "</p>");
        }
        document.getElementById("inputs_val").innerHTML = formatted_alerts.join("\n");
        validate_data_panel.show();
        validateFocusEl.focus();
    }
    return (form_valid ? true : false);
}


function register_validator(validatemethod, vkey, validateEls, vmsg, required, formId) {
    if (!vmsg) {
        alert("register_validator requires 4 arguments: (validatemethod, vkey, validateEls, vmsg, [required func]");
        return;
    }

    if (self.password_str_handle_validate) {
        password_str_handle_validate = 0;
    }

    if (!formId && validateEls && validateEls.length > 0 && !!validateEls[0]) {
        formId = validateEls[0].form.id;
    }

    if (!formId) {
        alert("register_validator requires either a list of form elements from which the formId could be derived or the formId parameter.");
        return;
    }

    if (!validators[formId] || validators[formId] == null) {
        validators[formId] = [];
    }

    validators[formId].push({
        method: validatemethod,
        vkey: vkey,
        Els: validateEls,
        msg: vmsg,
        required: required
    });
}

var reset_validators = function() {
    validators = {};
};

var _deactivate_validator = function(formId, formValidators, validatorId) {

    // if auto realtime_validate is enabled remove the action
    if (realtime_validate_inited[formId]) {
        for (var elId = 0; elId < formValidators[validatorId].Els; elId++) {
            var thisEl = formValidators[validatorId].Els[elId];
            if (thisEl.tagName == "TEXTAREA" || thisEl.type == "text" || thisEl.type == "password" || thisEl.type == "textbox") {
                YAHOO.util.Event.removeListener(thisEl, "keyup");
            } else if (thisEl.tagName == "SELECT" || thisEl.type == "file") {
                YAHOO.util.Event.removeListener(thisEl, "change");
            }
        }
    }
    formValidators.splice(validatorId, 1); // remove the validator
};

var remove_validator = function(config) {
    if (!config.formid && !config.action && !config.elementid) {
        alert("please pass {formid:'element_id', action:'validator_action', elementid:'elementname'}");
    } else {
        var formValidators = validators[config.formid]; // This is a reference to the array of validators for this form

        // Search though the array of validators for the one we one and call _deactivate_validator
        // on it once we find the element in it
        for (var validatorId = 0; validatorId < formValidators.length; validatorId++) {
            if (formValidators[validatorId].vkey === config.action) {

                // check to see if there is more than one element and process each
                for (var elId = 0; elId < formValidators[validatorId].Els.length; elId++) {
                    if (formValidators[validatorId].Els[elId].id === config.elementid) {
                        _deactivate_validator(config.formid, formValidators, validatorId);
                        break;
                    }
                }
            }
        }
    }
};

function apply_elements_status(elist) {
    for (var elId in elist) {
        if (elist[elId]) {
            setup_accept_image(elId, 1);
            YAHOO.util.Dom.removeClass(elId, "formverifyfailed");
        } else {
            setup_accept_image(elId, 0);
            YAHOO.util.Dom.addClass(elId, "formverifyfailed");
        }
    }
}

function setup_accept_image(parentElId, show) {

    var imgElIdCon = parentElId + "_status_image_con";
    var imgElCon = document.getElementById(imgElIdCon);

    if (!imgElCon) {
        var parentEl = document.getElementById(parentElId);

        var newdiv = document.createElement("div");
        newdiv.style.display = "block";
        newdiv.style.position = "absolute";

        newdiv.style.padding = 0;
        newdiv.style.margin = 0;
        newdiv.id = imgElIdCon;
        newdiv.innerHTML = "&nbsp;";


        if (show) {
            newdiv.className = "accept";
        } else {
            newdiv.className = "reject";
        }

        if (parentEl.nextSibling) {
            parentEl.parentNode.insertBefore(newdiv, parentEl.nextSibling);
        } else {
            parentEl.parentNode.appendChild(newdiv);
        }
        imgElCon = newdiv;

        reposition_validator_img(imgElCon);
        YAHOO.util.Event.addListener(imgElCon, "click", function() {
            validate_box(getPreviousInput(this).id);
        }, imgElCon, true);

        valImgs.push(imgElCon.id);

        return;
    }

    if (show == 2) {
        imgElCon.style.display = "none";
    } else if (show) {
        imgElCon.className = "accept";
        imgElCon.style.display = "";
    } else {
        imgElCon.className = "reject";
        imgElCon.style.display = "";
    }
}

function reposition_all_validator_imgs() {
    for (var i = 0; i < valImgs.length; i++) {
        reposition_validator_img(document.getElementById(valImgs[i]));
    }
}

function reposition_validator_img(imgElCon) {
    parentElId = getPreviousInput(imgElCon).id;
    parentEl = document.getElementById(parentElId);
    if (!parentEl) {
        alert("Could not get parent for " + parentElId + " next aw: " + imgElCon.id);
        return;
    }

    var parentReg = YAHOO.util.Region.getRegion(parentEl);

    // check to see if the input element has a specific validator positioning class
    var parentElPos;
    if (YAHOO.util.Dom.hasClass(parentEl, "validator_position_right") == true) {
        parentElPos = "right";
    }

    if ((parentElPos && parentElPos == "right") || parentEl.tagName == "SELECT" || parentEl.tagName == "TEXTAREA" || parentEl.type == "file") {
        imgElCon.style.left = (parentReg.left + parentEl.offsetWidth + 3) + "px";
    } else {
        imgElCon.style.left = (parentReg.left + parentEl.offsetWidth - 16 - (offsetQuirk ? 4 : 2)) + "px";
    }
    imgElCon.style.top = (parentReg.top + ((parentEl.offsetHeight - 16) / 2) - (offsetQuirk ? 2 : 0)) + "px";
}

function make_elements_valid_status(Els, status, elist) {
    for (var i = 0; i < Els.length; i++) {
        if (!Els[i].id) {
            Els[i].id = "validgen" + validgen++;
        }

        if (i > 0) {
            continue;
        } /* ignore elements that are not first in the list */

        if (status && elist[Els[i].id] != 0) {
            elist[Els[i].id] = 1;
        } else {
            elist[Els[i].id] = 0;
        }
    }
}

function getPreviousInput(El) {
    while (El.previousSibling && (El.tagName != "INPUT" || El.type == "submit" || El.type == "button") && El.tagName != "SELECT" && El.tagName != "TEXTAREA") {
        El = El.previousSibling;
    }
    return El;
}

function validate_listmatchers() {
    var allowed_matchers = [];
    for (var matcher in match_validators) {
        allowed_matchers.push(matcher);
    }
    return allowed_matchers.join(" ");
}

function get_url_depth() {
    if (cached_url_depth) {
        return cached_url_depth;
    }
    var thisurl = window.location.href;
    var urlpath = thisurl.split("/");
    urlpath.shift(); // http
    urlpath.shift(); // :
    urlpath.shift(); // HOST
    urlpath.pop(); // PAGE
    if (thisurl.match(/\/frontend\//)) {
        urlpath.shift();
        urlpath.shift();
    }
    var dotdot = [];
    for (i = 0; i < urlpath.length; i++) {
        dotdot.push("..");
    }
    cached_url_depth = dotdot.join("/");
    return cached_url_depth;
}

function radio_value_is(El, val) {
    if (isArray(El)) {
        for (var i = 0; i < El.length; i++) {
            if (El[i].value == val && El[i].checked) {
                return true;
            }
        }
    } else {
        if (El.value == val && El.checked) {
            return true;
        }
    }
    return false;
}

function isArray(tobj) {
    if (tobj.length > 0) {
        if (tobj[0] && tobj[0].length == 1) {
            return false;
        }
        return true;
    }
    return false;
}
var popupwindows = {};


function popupwindow_init(Elid, pixels, opts) {

    // Modified 5/1/12 -- can optionally pass opts {} which will override the
    // default initialization.  IE (opts = {fixedcenter=false,modal=true}) will
    // override fixedcenter's true default and add a modal true value to
    // the initialization. No other values are touched.  PAH
    var Elid;
    if (popupwindows[Elid]) {
        return;
    }
    if (!opts) {
        opts = {};
    }
    if (!pixels) {
        pixels = "500px";
    }

    var init = {
        effect: {
            effect: YAHOO.widget.ContainerEffect.FADE,
            duration: 0.25
        },
        width: pixels,
        buttons: [{
            text: "Close",
            handler: function() {
                popupwindows[Elid].hide();
            },
            isDefault: true
        }],
        fixedcenter: true,
        constraintoviewport: true,
        underlay: "none",
        close: true,
        visible: false,
        draggable: true,
        modal: false
    };

    for (var opt in opts) {
        init[opt] = opts[opt];
    }
    document.getElementById(Elid).style.display = "";
    popupwindows[Elid] = new YAHOO.widget.Dialog(Elid, init);
    popupwindows[Elid].render();
    popupwindows[Elid].beforeHideEvent.subscribe(handle_hide_popupwindow, Elid, true);
}

function handle_hide_popupwindow(ev, inc, Elid) {
    set_popup_display(Elid, "none");
}

function set_popup_display(Elid, dstyle) {
    var Elc = document.getElementById(Elid + "-content");
    if (!Elc) {
        alert("The " + Elid + "'-content' id is missing");
    }
    Elc.style.display = dstyle;

    var winc = document.getElementById(Elid + "_win");
    if (!winc) {
        return;
    }
    winc.style.display = dstyle;
}

function popupwindow_hide(Elid) {
    popupwindows[Elid].hide();
}

function popupwindow_show(Elid) {
    set_popup_display(Elid, "");
    popupwindows[Elid].render();
    popupwindows[Elid].show();
}
/* ***** BEGIN LICENSE BLOCK *****

# cpanel12 - interfacereset.js                  Copyright(c) 1997-2008 cPanel, Inc.
#                                                           All Rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited

 * ***** END LICENSE BLOCK *****
  * ***** BEGIN APPLICABLE CODE BLOCK ***** */


var interfaceConfigs = [];

function register_interfacecfg_nvdata(nvname) {
    interfaceConfigs.push(nvname);
}

var reset_all_interface_settings = function(securityToken) {

    var sFormData = "names=" + interfaceConfigs.join("|");
    for (var i = 0; i < interfaceConfigs.length; i++) {
        sFormData += "&" + interfaceConfigs[i] + "=";
        NVData[interfaceConfigs[i]] = "";
    }

    var success_function = function() {
        window.location.reload(true);
    };

    // refresh the page once the ajax call completes
    var callback = {
        success: success_function
    };

    var token = securityToken || CPANEL.security_token;

    if (self.YAHOO) {
        YAHOO.util.Connect.asyncRequest("POST", token + "/frontend/" + window.thisTheme + "/nvset.xml", callback, sFormData);
    } else {
        $.post( token + "/frontend/" + window.thisTheme + "/nvset.xml", sFormData, success_function);
    }
};

register_interfacecfg_nvdata("ignorecharencoding");
