//
// Copyright (c) Microsoft. All rights reserved.
// Licensed under the MIT license. See LICENSE file in the project root for full license information.
//

'use strict';

const querystring = require('querystring');

module.exports = function configurePassport(app, passport, initialConfig) {
  // ----------------------------------------------------------------------------
  // passport integration with GitHub
  // ----------------------------------------------------------------------------
  app.get('/signin/github', function (req, res) {
    if (req.session && req.headers && req.headers.referer) {
      req.session.referer = req.headers.referer;
    }
    return res.redirect('/auth/github');
  });

  var ghMiddleware = initialConfig.primaryAuthenticationScheme === 'github' ? passport.authenticate('github') : passport.authorize('github');

  app.get('/auth/github', ghMiddleware);

  app.get('/auth/github/callback', ghMiddleware, (req, res) => {
    if (initialConfig.primaryAuthenticationScheme !== 'github') {
      req.user.github = req.account.github;
    }
    var url = '/';
    if (req.session && req.session.referer) {
      url = req.session.referer;
      delete req.session.referer;
    }
    res.redirect(url);
  });

  if (initialConfig.primaryAuthenticationScheme === 'aad') {
    app.get('/signin/github/join', (req, res, next) => {
      res.render('creategithubaccount', {
        title: 'Create a GitHub account',
      });
    });

    app.get('/auth/github/join', (req, res, next) => {
      var config = req.app.settings.runtimeConfig;
      var authorizeRelativeUrl = req.app.settings['runtime/passport/github/authorizeUrl'].replace('https://github.com', '');
      var joinUrl = 'https://github.com/join?' + querystring.stringify({
          return_to: `${authorizeRelativeUrl}?` + querystring.stringify({
            client_id: config.github.clientId,
            redirect_uri: config.github.callbackUrl,
            response_type: 'code',
            scope: '', // TODO: Improve by pulling from object?
          }),
        source: 'oauth',
      });
      res.redirect(joinUrl);
    });
  }

  app.get('/signout', function (req, res) {
    var config = req.app.settings.runtimeConfig;
    req.logout();

    if (config.primaryAuthenticationScheme === 'github') {
      res.redirect('https://github.com/logout');
    } else {
      res.render('message', {
        messageTitle: 'Goodbye!',
        message: 'You have been signed out.',
        buttonText: 'Sign In Again',
      });
    }
  });

  app.get('/signout/github', function (req, res) {
    if (req.app.settings.runtimeConfig.primaryAuthenticationScheme === 'github') {
      return res.redirect('/signout');
    }
    if (req.user && req.user.github) {
      delete req.user.github;
    }
    var url = req.headers.referer || '/';
    res.redirect(url);
  });

  // ----------------------------------------------------------------------------
  // Expanded GitHub auth scope routes
  // ----------------------------------------------------------------------------
  app.get('/signin/github/increased-scope', function (req, res){
    if (req.session && req.headers && req.headers.referer) {
      req.session.referer = req.headers.referer;
    }
    return res.redirect('/auth/github/increased-scope');
  });

  // TODO: xxx
  app.get('/auth/github/increased-scope', passport.authorize('expanded-github-scope'));

  // TODO: xxx
  app.get('/auth/github/callback/increased-scope',
    passport.authorize('expanded-github-scope'), function (req, res, next) {
      var account = req.account;
      var user = req.user;
      user.github.increasedScope = account;
      var url = '/';
      if (req.session && req.session.referer) {
        url = req.session.referer;
        delete req.session.referer;
      }
      res.redirect(url);
  });

  // ----------------------------------------------------------------------------
  // passport integration with Azure Active Directory
  // ----------------------------------------------------------------------------
  var aadMiddleware = initialConfig.primaryAuthenticationScheme === 'github' ? passport.authorize('azure-active-directory') : passport.authenticate('azure-active-directory');

  app.get('/auth/azure', aadMiddleware);
  
  app.post('/auth/azure/callback', aadMiddleware, (req, res, next) => {
    if (initialConfig.primaryAuthenticationScheme !== 'aad') {
      req.user.azure = req.account.azure;
    }                
    var url = '/';
    if (req.session && req.session.referer) {
      url = req.session.referer;
      delete req.session.referer;
    }
    return res.redirect(url);
  });

  app.get('/signin/azure', function(req, res){
    if (req.session && req.headers && req.headers.referer) {
      if (req.session.referer === undefined) {
        req.session.referer = req.headers.referer;
      }
    }
    return res.redirect('/auth/azure');
  });

  app.get('/signout/azure', function(req, res){
    if (req.app.settings.runtimeConfig.primaryAuthenticationScheme === 'aad') {
      return res.redirect('/signout');
    }
    if (req.user && req.user.azure) {
        delete req.user.azure;
    }
    res.redirect('/');
  });
};
