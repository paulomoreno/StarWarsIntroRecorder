#!/usr/bin/env casperjs

// XXX CasperJS with SlimerJS somehow doesn't understand relative path imports
var config = {
  viewportSize: {
    width: 1280,
    height: 720,
  },
  timeFactor: 1,
  sync: [
    9,
    9,
    70,
    9,
  ],
};

var Timer = function() {
  this.start = new Date();
};

Timer.prototype.getElapsed = function() {
  return new Date() - this.start;
};

Timer.reset = function() {
  this.start = new Date();
};

var casper = require('casper').create(config);

var id = casper.cli.args[0];
var opening = null;

// Scrap the opening from firebase first
casper.start('https://starwarsopening.firebaseio.com/openings/-' + id + '.json', function() {
  opening = opening = JSON.parse(this.getPageContent());

  if (!opening) {
    this.exit(1);
  }
});

// Open the customized StarWarsIntroCreator to start taking screenshots
casper.thenOpen(casper.cli.options['creator-path'], function() {
  // Initiate the Intro
  this.evaluate(function(opening) {
    window.playIntro(opening);
  }, opening);

  // Calculate the points where the frames should be precisely synced with the
  // music on the delayed version of the Star Wars Intro Creator.
  var sum = 0;
  var syncings = config.sync.map(function(time) {
    sum += time * config.timeFactor;
    return sum;
  });

  // Which part of the intro are we?
  // 0 -> A long time ago in a galaxy far far away
  // 1 -> logo appearance
  // 2 -> text crawl
  // 3 -> scroll down
  var stage = 0;
  var frame = 0;
  var destination = './dist/screenshots/' + id + '-';

  var overallTimer = new Timer();

  var record = function() {
    var localTimer = new Timer();
    var syncing = syncings[stage];

    // No more sync stages to cover, finish
    if (syncing === undefined) {
      return;
    }

    // Take the screenshot
    casper.captureSelector(destination + stage + '-' + frame++ + '.png', 'body');

    if (overallTimer.getElapsed() > (syncing * 1000)) {
      // Provide information to STDOUT listeners about how much framerate
      // was reached during this record.
      var framerate = (frame / config.sync[stage]);
      console.log('__FRAMES_PER_SECOND_' + stage + '__: ' + framerate);

      // Proceed to the next stage
      stage++;
      frame = 0;
    }

    // Calculate how much should we delay the next frame capture, considering
    // how much time it took to take the current screenshot
    var delay = (1000 * config.timeFactor) / 30;
    delay = Math.max(delay - localTimer.getElapsed(), 1);

    // Continue capturing screenshots, limiting the framerate by 30 so that
    // we have a more uniform capture
    casper.wait(delay, record);
  };

  // Start recording
  record();
});

// Run all set callbacks
casper.run();
