'use strict';

var assert = require('assert'),
  fs = require('fs'),
  path = require('path'),
  sass = require('node-sass');

/**
 * The core jigsass-test API can be imported with:
 * ```
 * var jigsassTest = require('jigsass-test');
 * ```
 * @module jigsass-test
 */

module.exports = {
  paths: {
    // Assuming this is normally installed in ./node_modules/jigsass-test/lib, we
    // will also assume that the fixtures directory is in ./test/fixtures
    fixtures: path.join(__dirname, '../../../', 'test/fixtures'),

    // Location of scss according to standard JigSass file structure.
    module: path.join(__dirname, '../../../', 'scss'),

    // Add the module to `includePaths`
    includePaths: [module]
  },

  /**
   * Override the default paths needed for the jigsassTest object.
   *
   * ```
   * var jigsassTest = require('jigsass-test');
   * jigsassTest.configurePaths({
   *   fixtures: '/my/path/to/fixtures',
   *   includePaths: ['/my/path/to/library']
   * });
   * ```
   *
   * If jigsass-test is installed in node_modules and your test fixtures are in
   * `./test/fixtures` (relative to the root of your project), then jigsass-test
   * will automatically configure the `fixtures` path without you having to set
   * `fixtures` with `configurePaths()`.
   *
   * @param {object} config - A configuration object containing the properties:
   *   `fixtures` and `includePaths`.
   */
  configurePaths: function(config) {
    // Don't override the default values or previously-set values, if no new
    // values are provided.
    if (config.fixtures) {
      this.paths.fixtures = config.fixtures;
    }
    if (config.includePaths) {
      this.paths.includePaths = config.includePaths;
    }
  },

  /**
   * Returns the full path to the requested test fixture.
   *
   * When called without any parameters, this method returns the path to the
   * test fixtures directory. If one or more parameters are given, the method
   * will append them to the returned path.
   *
   * ```
   * var jigsassTest = require('jigsass-test');
   *
   * // Returns full path to the test fixtures.
   * var fixturePath = jigsassTest.fixture();
   * // Returns full path to [fixtures]/sub-folder.
   * var fixturePath = jigsassTest.fixture('sub-folder');
   * // Returns full path to [fixtures]/sub-folder/_file.scss.
   * var fixturePath = jigsassTest.fixture('sub-folder', '_file.scss');
   * ```
   *
   * @param {...string} path - Optional paths inside the fixtures directory.
   * @returns {string} The path to the requested test fixture.
   */
  fixture: function() {
    // Add the fixtures path to the start our list of paths.
    var args = Array.prototype.slice.call(arguments);
    args.unshift(this.paths.fixtures);
    return path.join.apply(this, args);
  },

  /**
   * Renders a test fixture using `node-sass` and returns the result.
   *
   * In addition to running node-sass' render(), this method:
   * - adds the test fixtures path directory to the includePaths
   * - ensures the includePaths are passed to node-sass
   * - converts render.css from a buffer to a string
   * - converts render.map to an object (Note: you will need to configure the
   *   proper sourcemap options)
   * - Captures messages generated with `@warn` and puts them in an array available
   *   to the callback in `render.warn`.
   * - Captures messages generated with `@debug` and puts them in an array available
   *   to the callback in `render.debug`.
   *
   * The `testFixture` method renders the `input.css` from the specified folder in
   * test/fixtures, and reads the output.css file. If no Sass error occurs, it compares
   * the results to the expected output using `assert.strictEqual()`.
   *
   * `testFixture()` does not throw on an error, but rather passes it to the callback
   * where it can be examined to decide if a Sass error is a test failure or not.
   *
   * Good Sass libraries should `@error` if used incorrectly and jigsass-test lets
   * you see these errors and assert they were the expected result.
   *
   * ```
   * var jigsassTest = require('jigsass-test');
   *
   * describe('a test suite', function() {
   *   it('should test something', function(done) {
   *     var options = {
   *       data: '@import "init"; // Imports fixtures/_init.scss.'
   *     };
   *     jigsassTest.testFixture('sometest', options, function(error, result, expectedOutput) {
   *       // If there was no error, testFixture() has already compared
   *       // the rendered output of fixtures/sometest/input.scss to
   *       // fixtures/sometest/output.css.
   *       if (error) assert.strictEqual(error, 'Some useful `@error` message');
   *
   *       assert.strictEqual(result.warn[0], 'Some useful `@warn` message');
   *     });
   *
   *     done();
   *   });
   * });
   * ```
   *
   * @param {string} fixtureDirectory - The path (relative to the fixtures base
   *   directory) to the fixture to test.
   * @param {object} options - The options to pass to node-sass' render(). For
   *   the full list of options, see the [node-sass documentation for
   *   "options"](https://github.com/sass/node-sass#options).
   * @param {function} callback - An asynchronous callback with the signature of
   *   `function(error, result, expectedOutput)`. The expectedOutput is always
   *   given the contents of the output.css file in the specified fixture. In
   *   error conditions, the error argument is populated with the error object.
   *   In success conditions, the result object is populated with an object
   *   describing the result of the render call. For full details, see the
   *   [node-sass documentation for the error and result
   *   objects](https://github.com/sass/node-sass#error-object).
   */
  testFixture: function(fixtureDirectory, options, callback) {
    var sassOptions = options || {};
    sassOptions.file = this.fixture(fixtureDirectory, 'input.scss');
    sassOptions.outFile = this.fixture(fixtureDirectory, 'output.css');

    sassOptions.includePaths = sassOptions.includePaths || [];

    // Add the test fixtures directory.
    sassOptions.includePaths.push(this.fixture());

    // Add the includePaths to node-sass' include paths.
    Array.prototype.push.apply(sassOptions.includePaths, this.paths.includePaths);

    var getExpectedOutput = new Promise(
      function readOutputFile(resolve, reject) {
        // Read the output.css file.
        fs.readFile(sassOptions.outFile, 'utf8', function(error, fileContent) {
          // Reject the promise with the error message;
          if (error) {
            reject(error);
          } else {
            resolve({expectedOutput: fileContent});
          }
        });
      }
    );


    var renderSass = new Promise(
      function getSassResult(resolve, reject) {
        var warn = [];
        var debug = [];

        sassOptions.data = '@import "' + path.join(fixtureDirectory, 'input') + '"';
        sassOptions.functions = sassOptions.functions || {};
        sassOptions.functions['@warn'] = function(message) {
          warn.push(message.getValue());
          return sass.NULL;
        };
        sassOptions.functions['@debug'] = function(message) {
          debug.push(message.getValue());
          return sass.NULL;
        };
        sassOptions.sourceMap = true;
        sassOptions.omitSourceMapUrl = true;

        sass.render(sassOptions, function(error, result) {
          if (error) {
            reject(error);
          } else {
            // Convert sass' result.css buffer to a string.
            result.css = result.css.toString();

            // Convert sass' sourcemap string to a JSON object.
            if (result.map) { result.map = JSON.parse(result.map.toString()); }

            // Add waring and debugging messages to the result object.
            result.warn = warn;
            result.debug = debug;
            resolve({sassOutput: result});
          }

        });
      }
    );

    Promise.all([getExpectedOutput, renderSass])
      .then(function executeTests(values) {
        var expectedOutput = values[0]['expectedOutput'] || values[1]['expectedOutput'];
        var sassOutput = values[0]['sassOutput'] || values[1]['sassOutput'];

        assert.strictEqual(sassOutput.css, expectedOutput);

        callback(null, sassOutput, expectedOutput);
      },

      // If a promise was rejected
      function handleSassTestReject(reason) {
        callback(reason, null, null);
      });
  }
};
