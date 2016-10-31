'use strict';
var express = require('express');						// http://expressjs.com/en									npm install express --save
var env = require('node-env-file');						// https://github.com/grimen/node-env-file					npm install node-env-file --save
var methodOverride = require('method-override');		// https://github.com/expressjs/method-override             npm install method-override --save
var passport = require('passport');						// https://github.com/jaredhanson/passport					npm install passport --save
var ForceDotComStrategy = require('passport-forcedotcom').Strategy;	// https://github.com/joshbirk/passport-forcedotcom		npm install passport-forcedotcom --save
var BasicStrategy = require('passport-http').BasicStrategy; // https://github.com/jaredhanson/passport-http npm install passport-http --save
var db = require('./db');
//var util = require('util');	//don't need?
  
// Reads configuration from .env, if file does not exist then ignore
	try {
		env(__dirname + '/env');
		console.log("ENV: " + process.env.LOCATION);
		console.log("CALLBACK_URL: " + process.env.CALLBACK_URL);
	} catch (e) {
		console.log("The file 'env' was not found, so no settings were loaded");
	}
//----------------------------------------------------------------------------
// LOAD THE BELOW SETTINGS FROM env FILE TO MATCH YOUR SALESFORCE CONNECTED-APP'S SETTINGS
// ONE for localHost, one for Heroku
//----------------------------------------------------------------------------

// Set Force.com app's clientID
// Set Force.com app's clientSecret

// Note: You should have a app.get(..) for the callback URL to receive callback
// from Force.com
//
// For example, if your callback url is:
//
//   https://localhost:3000/auth/forcedotcom/callback
// 
// then, you should have a HTTP GET endpoint like:
//
//   app.get('/auth/forcedotcom/callback, callback))

// Salesforce Authorization URL (this defaults to:
// https://login.salesforce.com/services/oauth2/authorize)
// var SF_AUTHORIZE_URL = 'https://login.salesforce.com/services/oauth2/authorize';

// Salesforce token URL (this defaults to:
// https://login.salesforce.com/services/oauth2/token)
var SF_TOKEN_URL = 'https://login.salesforce.com/services/oauth2/token';

//----------------------------------------------------------------------------


// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.  However, since this example does not
//   have a database of user records, the complete Salesforce profile is
//   serialized and deserialized.
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


// Use the ForceDotComStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and Salesforce
//   profile), and invoke a callback with a user object.
//   use environment varaibles for local/heroku differences
var sfStrategy = new ForceDotComStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  scope: ['id','api','refresh_token'],
  callbackURL: process.env.CALLBACK_URL,
  authorizationURL: process.env.SF_AUTHORIZE_URL,
  tokenURL: SF_TOKEN_URL
}, function(accessToken, refreshToken, profile, done) {

  // asynchronous verification, for effect...
  process.nextTick(function() {

    // To keep the example simple, the user's forcedotcom profile is returned to
    // represent the logged-in user.  In a typical application, you would want
    // to associate the forcedotcom account with a user record in your database,
    // and return that user instead.
    //
    // We'll remove the raw profile data here to save space in the session store:
    delete profile._raw;
    return done(null, profile);
  });
});

//passport.use(sfStrategy); // not going to use this in this one...

// Configure the Basic strategy for use by Passport.
//
// The Basic strategy requires a `verify` function which receives the
// credentials (`username` and `password`) contained in the request.  The
// function must verify that the password is correct and then invoke `cb` with
// a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new BasicStrategy(
  function(username, password, cb) {
    db.users.findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (user.password != password) { return cb(null, false); }
      return cb(null, user);
    });
  }));


var app = express();

// // configure Express
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.logger());
app.use(express.cookieParser());
app.use(express.json());
app.use(express.urlencoded());
app.use(methodOverride());
app.use(express.session({
  secret: 'keyboard cat'
}));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(express.static(__dirname + '/public'));

app.get('/',
  passport.authenticate('basic', { session: false }),
  function(req, res) {
    res.json({ username: req.user.username, email: req.user.emails[0].value });
  });

/*
app.get('/login', function(req, res) {
  req.logout();
  req.session.destroy();

  res.render('login', {
    user: req.user
  });
});

// GET /authenticate
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in Force.com authentication will involve
//   redirecting the user to your domain.  After authorization, Force.com will
//   redirect the user back to this application at /auth/forcedotcom/callback
app.get('/authenticate', passport.authenticate('forcedotcom'), function(req, res) {
  // The request will be redirected to Force.com for authentication, so this
  // function will not be called.
});

// GET /authenticate/callback
//   PS: This MUST match what you gave as 'callback_url' earlier
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get('/authenticate/callback', passport.authenticate('forcedotcom', {
  failureRedirect: '/login'
}), function(req, res) {
  res.redirect('/');
});

app.get('/logout', function(req, res) {
  res.redirect('/login');
});
*/
//dummy API resources
var resources = [
    {
        id: 1,
        name: 'Foo'
    },
	{
        id: 2,
        name: 'Bar'
    }
];

app.get('/resources',
  passport.authenticate('basic', { session: false }),
  function (req, res) {
    res.send(resources);
  });

app.get('/resources/:id', 
  passport.authenticate('basic', { session: false }),
  function(req, res) {
    var id = parseInt(req.params.id, 10);
    var result = resources.filter(r => r.id === id)[0];
 
    if (!result) {
        res.sendStatus(404);
    } else {
        res.send(result);
    }
});
/*
app.get('/resources', ensureAuthenticated, function(req, res) {
    res.send(resources);
});
 
app.get('/resources/:id', ensureAuthenticated, function(req, res) {
    var id = parseInt(req.params.id, 10);
    var result = resources.filter(r => r.id === id)[0];
 
    if (!result) {
        res.sendStatus(404);
    } else {
        res.send(result);
    }
});
*/
//let's see....
var port = process.env.PORT || 3000;
app.listen(port);


// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.

function ensureAuthenticated(req, res, next) {
  if(req.isAuthenticated()) {
    return next();
  }
  res.redirect('/login');
}
