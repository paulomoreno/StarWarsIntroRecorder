'use strict';

var Renderer = require('./renderer');

module.exports = class Scheduler {
  /* Instantiates a video render scheduler
   *
   * @param renderers {Integer} The number of renderers to be used (min=1)
   */
  constructor(renderers) {
    // Default value assigning
    renderers = renderers || 1;

    this.index = 0;
    this.renderers = [];

    for (var i = 0; i < renderers; i++) {
      this.renderers.push(new Renderer());
    }
  }

  /* Add a video request to a Renderer
   *
   * @param request {Object} a {[email], code} object containing request data
   */
  add(request) {
    // Round Robin through all renderers
    this.renderers[this.index++].add(request);
    this.index = this.index % this.renderers.length;
  }

  /* Returns the size of the largest rendering queue */
  queued() {
    return this.renderers.reduce(function(memo, current) {
      return Math.max(memo, current.queued());
    }, 0);
  }

  /* Push a video request to the first available location on the queue */
  expressify(code) {
    this.renderers.forEach(function(renderer) {
      renderer.expressify(code);
    });
  }

  status(code) {
    var position = null;

    code && this.renderers.forEach(function(renderer) {
      if (renderer.processing.code === code) {
        // Is currently processing, queue is 0
        position = {
          queue: 0,
          request: renderer.processing,
        };
        return;
      }

      renderer.queue.forEach(function(request, index) {
        if (request.code === code) {
          // Something is processing and code was found, queue is i + 1
          position = {
            queue: index + 1,
            request: request,
          };
        }
      });
    });

    return position || {
      queue: this.queued(),
      request: null,
    };
  }
}
