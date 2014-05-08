// setup ractive. see http://ractivejs.org
var ractive = new Ractive({
  el: 'container',       // bind to div id=container
  template: '#template', // use script id='template'
  data: { }              // empty inital data
});

// setup router. see https://github.com/flatiron/director
var router = Router({

  '/space/_new':              route_space_new,
  '/space/:space/_settings':  route_space_settings,
  '/space/:space':            route_space_index,

  '/space/:space/_new':       route_entry_new,
  '/space/:space/*/_edit':    route_entry_edit,
  '/space/:space/*':          route_entry_view,

  '/':                        route_app_index
});

// create our db to hold info about all the spaces
// see http://pouchdb.com
var spaces = new PouchDB('-spaces');
var active_pouches = {};

// kick things off, if no route, default to /
router.init('/');

/*************************************************************/
/*  Route handler methods                                    */
/*************************************************************/

// list all the spaces.
function route_app_index(){
  var view = { app_index: true }
  ractive.set('view', view);
  ractive.set('space', null);
  ractive.set('page', null);

  spaces.allDocs().then(function(resp){
    ractive.set('view.resp', resp);
  })
}

// form to create a new space
function route_space_new(){
  var view = { space_new: true }
  ractive.set('view', view);
  ractive.set('doc', { _id: null, hosted_url: null });
  ractive.off('_create');
  ractive.on('_create', function(event){
    event.original.preventDefault();
    var doc = ractive.get('doc');
    spaces.put(doc).then(function(){
      router.setRoute('/space/' + doc._id);
    })
  })
}

// form to edit the space settings
function route_space_settings(space){
  console.log('space settings', space);
}

// list all the recent pages
function route_space_index(space){
  var view = { space_index: true }
  ractive.set('view', view);
  ractive.set('space', space);
  ractive.set('page', null);

  obtain(space, function(err, pouch){

    if (err && err === 'not_found') return ractive.set('view.not_found', true);

    pouch.query('miki/by_time', {descending: true, limit: 10 },function(err, resp){
      ractive.set('rows', resp.rows);
    })

  })
}

// form to create a new entry in the space
function route_entry_new(space) {
  var view = { entry_edit: true };  // reuse the edit view
  ractive.set('view', view);

  entry_setup(space, null, function(err, doc, pouch){
    ractive.off('save');
    ractive.on('save', function(event){
      event.original.preventDefault();
      var doc = ractive.get('doc');
      doc._id = ractive.get('page.slug');
      doc.modified = new Date().getTime();
      pouch.put(doc, function(err, resp){
        if (err) return console.log(err);
        router.setRoute('/space/' + space + '/' + doc._id);
      })
    })

  })
}

// view rendered markdown entry in a space
function route_entry_view(space, id){
  var view = { entry_view: true }
  ractive.set('view', view);

  entry_setup(space, id, function(err, doc){
    if (err && err.name === 'not_found') ractive.set('error.not_found', true);
    if (doc.entry) ractive.set('page.entry', marked(doc.entry));
  })

}

// edit the entry in a space
function route_entry_edit(space, id) {
  var view = { entry_edit: true }
  ractive.set('view', view);

  entry_setup(space, id, function(err, doc, pouch){
    if (err && err.name === 'not_found') ractive.set('error.not_found', true);
    if (err && err.name !== 'not_found') return console.log('an error occured');
    ractive.off('save');
    ractive.on('save', function(event){
      event.original.preventDefault();
      var doc = ractive.get('doc');
      doc.modified = new Date().getTime();
      pouch.put(doc, function(err, resp){
        if (err) return console.log(err);
        router.setRoute('/space/' + space + '/' + doc._id);
      })
    })

  })
}


/*************************************************************/
/*  helpful methods                                          */
/*************************************************************/

// obtain a pouchdb for a named space
// cb - function(err, pouch);
function obtain(space, cb){
  if (active_pouches[space]) return cb(null, active_pouches[space]);
  spaces.get(space, function(err, details){

    if (err && err.name === 'not_found') return cb('not_found');
    init(details._id, details.hosted_url, function(err, pouch){
      if (err) return cb(err);
      active_pouches[space] = pouch;
      cb(null, pouch);
    })
  })
}

// initialize a space
// - creates a pouchdb instance
// - puts the design doc, if it does not exist
// - starts the sync to/from the hosted_url
// - updates the index
// cb - function(err, pouch)
function init(name, hosted_url, cb){
  var pouch = new PouchDB(name);
  pouch.put(miki_design_doc(), function(err){
    if (hosted_url) pouch.sync(hosted_url, {live: true});
    pouch.query('miki/by_time', {stale: 'update_after'});
    cb(null, pouch);
  })
}


// reusable helper to setup an entry
// cb - function(err, doc, pouch)
function entry_setup(space, id, cb) {
  // first obtain the pouch for the space
  obtain(space, function(err, pouch){
    if (err) return ractive.set('space', null);

    var page = {
      slug: id,
      title: id,
      entry: null
    };
    var _doc = {
     _id: id,
      entry: null
    }
    ractive.set('space', space);
    ractive.set('rows', null);
    ractive.set('error', null);
    ractive.set('page', page);
    if (!id) {
      ractive.set('doc', _doc);
      return cb(null, _doc, pouch);
    }
    // get the actual doc
    pouch.get(id, function(err, doc){
      ractive.set('error', err);
      if (!doc) return cb(null, _doc, pouch);
      ractive.set('doc', doc);
      cb(err, doc, pouch);
    });

  })

}


// a simple design doc.
function miki_design_doc(){
  return {
    _id: '_design/miki',
    views: {
      'by_time': {
        map: function (doc) { emit(doc.modified); }.toString()
      }
    }
  }
}

