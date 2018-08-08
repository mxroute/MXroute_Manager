#!/usr/local/cpanel/3rdparty/bin/perl
# cpanel - base/frontend/paper_lantern/test.live.pl
#                                                    Copyright 2014 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited

use strict;

use Cpanel::LiveAPI ();

my $cpanel = Cpanel::LiveAPI->new();

print "Content-type: text/html\r\n\r\n";

print $cpanel->header('Example perl Page!');

print "to be completely honest with you, I wouldn't implemnet this this way.<br />\n";
print "I'd just make a new template toolkit file and put it in paper lantern's theme root.";

print $cpanel->footer();

$cpanel->end();

