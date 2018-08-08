#!/usr/local/cpanel/3rdparty/bin/perl
# cpanel - base/frontend/paper_lantern/test.live.pl
#                                                    Copyright 2013 cPanel, Inc.
#                                                           All rights Reserved.
# copyright@cpanel.net                                         http://cpanel.net
# This code is subject to the cPanel license. Unauthorized copying is prohibited

## no critic qw(RequireUseStrict)

BEGIN {
    unshift @INC, '/usr/local/cpanel';
}

use Cpanel::LiveAPI ();
use Data::Dumper    ();

my $cpanel = Cpanel::LiveAPI->new();

print "Content-type: text/html\r\n\r\n";

print "<pre>";

print Data::Dumper::Dumper( $cpanel->exec('<cpanel print="cow">') );
print Data::Dumper::Dumper( $cpanel->api1( 'print', '', ['cow'] ) );
print Data::Dumper::Dumper( $cpanel->exec('<cpanel setvar="debug=0">') );
print Data::Dumper::Dumper( $cpanel->api( 'exec', 1, 'print', '', ['cow'] ) );
print Data::Dumper::Dumper( $cpanel->cpanelprint('$homedir') );
print Data::Dumper::Dumper( $cpanel->cpanelprint('$hasvalidshell') );
print Data::Dumper::Dumper( $cpanel->cpanelprint('$isreseller') );
print Data::Dumper::Dumper( $cpanel->cpanelprint('$isresellerlogin') );
print Data::Dumper::Dumper( $cpanel->exec('<cpanel Branding="file(local.css)">') );
print Data::Dumper::Dumper( $cpanel->exec('<cpanel Branding="image(ftpaccounts)">') );
print Data::Dumper::Dumper ( $cpanel->api2( 'Email', 'listpopswithdisk', { 'api2_paginate' => 1, 'api2_paginate_start' => 1, 'api2_paginate_size' => 10, "acct" => 1 } ) );
print Data::Dumper::Dumper( $cpanel->fetch('$CPDATA{\'DNS\'}') );
print Data::Dumper::Dumper( $cpanel->api2( 'Ftp', 'listftpwithdisk', { "skip_acct_types" => 'sub' } ) );
print Data::Dumper::Dumper( $cpanel->api3( 'SSL', 'list_keys' ) );
print Data::Dumper::Dumper( $cpanel->api3( { 'SSL' => 1 }, 'list_keys' ) );    # should complain about an untrappable error

if ( $cpanel->cpanelif('$haspostgres') )  { print "Postgres is installed\n"; }
if ( $cpanel->cpanelif('!$haspostgres') ) { print "Postgres is not installed\n"; }
if ( $cpanel->cpanelfeature("fileman") ) {
    print "The file manager feature is enabled\n";
}
print "test complete\n";
$cpanel->end();

