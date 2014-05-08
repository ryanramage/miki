Miki - offline first, micro wiki
=================================

How to use
----------

    git clone https://github.com/ryanramage/miki
    cd miki
    open index.html

What about saving data?
------------------------

Miki uses pouchdb to store in the data browser. You can optionally configure each space
to sync with a couchdb. So all your devices can have the same data!

Why Miki
--------

This is a ridiculously small app. ~200 lines of js to show how to make a simple offline
first app in which you own your own data. Please make more of these.

It also shows the power of [ractive](http://ractivejs.org) and [pouchdb](http://pouchdb.com).

Couch Sync
----------

To replicate with CouchDB, you need to make sure CORS is enabled.
Follow the example instructions below.
By default, CouchDB will be installed in "Admin Party", so
only set the username and password if you have created an admin.
Replace myname.iriscouch.com with your own host
(127.0.0.1:5984 if installed locally)

    $ export HOST=http://username:password@myname.iriscouch.com
    $ curl -X PUT $HOST/_config/httpd/enable_cors -d '"true"'
    $ curl -X PUT $HOST/_config/cors/origins -d '"*"'
    $ curl -X PUT $HOST/_config/cors/credentials -d '"true"'
    $ curl -X PUT $HOST/_config/cors/methods -d '"GET, PUT, POST, HEAD, DELETE"'
    $ curl -X PUT $HOST/_config/cors/headers -d \
      '"accept, authorization, content-type, origin"'