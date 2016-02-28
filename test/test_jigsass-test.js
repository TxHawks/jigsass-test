'use strict';

/* eslint-disable no-unused-vars */
var path = require('path'),
  sass = require('node-sass'),
  jigsassTest = require('../lib/jigsass-test.js'),
  should = require('chai').should();
/* eslint-enable no-unused-vars */

describe('jigsass-test', function() {
  describe('API', function() {
    ['configurePaths',
      'fixture',
      'testFixture'
    ].forEach(function(method) {
      it('has ' + method + '() method', function(done) {
        jigsassTest.should.have.property(method);
        jigsassTest[method].should.be.function;
        done();
      });
    });
  });

  describe('.configurePaths()', function() {
    it('should not override the default fixtures path', function(done) {
      path.relative(
        path.join(__dirname, '../../../'),
        jigsassTest.paths.fixtures
      ).should.equal('test/fixtures');

      // Simulate jigsass-test being installed in node-modules/jigsass-test/.
      var jigsassTestMock = require('./fixtures/node_modules/jigsass-test-mock');

      path.relative(
        path.join(__dirname, '../'),
        jigsassTestMock.paths.fixtures
      ).should.equal('test/fixtures');
      done();
    });

    it('should set the fixtures path', function(done) {
      jigsassTest.configurePaths({
        fixtures: 'a/path'
      });
      jigsassTest.paths.fixtures.should.equal('a/path');
      done();
    });

    it('should set the includePaths path', function(done) {
      jigsassTest.configurePaths({
        includePaths: ['b/path']
      });
      jigsassTest.paths.includePaths[0].should.equal('b/path');
      done();
    });

    it('should not reset to the default value a previously set includePaths path', function(done) {
      jigsassTest.configurePaths({
        includePaths: ['c/path']
      });
      jigsassTest.configurePaths({});
      jigsassTest.paths.includePaths[0].should.equal('c/path');
      done();
    });

    after(function(done) {
      // Reset the paths for the rest of the tests.
      jigsassTest.configurePaths({
        fixtures: path.join(__dirname, 'fixtures'),
        includePaths: [path.join(__dirname, 'fixtures/my-sass-library')]
      });
      done();
    });
  });

  describe('.fixture()', function() {
    it('should return the path to the fixtures directory', function(done) {
      jigsassTest.fixture().should.equal(path.join(__dirname, 'fixtures'));
      done();
    });

    it('should return the path to the sub-directory of fixtures', function(done) {
      jigsassTest.fixture('fixture').should.equal(path.join(__dirname, 'fixtures/fixture'));
      done();
    });

    it('should accept multiple arguments', function(done) {
      jigsassTest.fixture('fixture', 'jigsass-test-mock.js').should.equal(path.join(__dirname, 'fixtures/fixture/jigsass-test-mock.js'));
      done();
    });
  });

  describe('.testFixture()', function() {
    it('should render the input.scss file of the given fixtures directory', function(done) {
      jigsassTest.testFixture('testFixture/success', {}, function(error, result, expectedOutput) {
        result.css.should.be.string;
        should.not.exist(error);
        result.css.should.equal('.test {\n  content: "testFixture() test"; }\n');
        expectedOutput.should.exist;
        done();
      });
    });

    it('should create a sourcemap', function(done) {
      jigsassTest.testFixture('testFixture/success', {}, function(error, result, expectedOutput) {
        should.not.exist(error);
        expectedOutput.should.exist;
        result.map.should.be.object;
        result.map.file.should.equal('output.css');
        result.map.sources.should.be.array;
        result.map.sources.should.eql(['input.scss', 'input.scss']);
        done();
      });
    });

    it('should return the node-sass result object', function(done) {
      jigsassTest.testFixture('testFixture/success', {}, function(error, result, expectedOutput) {
        should.not.exist(error);
        expectedOutput.should.exist;
        result.should.be.object;
        result.should.have.property('css');
        result.css.should.be.string;
        result.should.have.property('map');
        result.map.should.be.object;
        result.should.have.property('stats');
        result.css.should.be.object;
        done();
      });
    });

    it('should return the node-sass error', function(done) {
      jigsassTest.testFixture('testFixture/failure', {}, function(error, result, expectedOutput) {
        should.not.exist(result);
        // expectedOutput.should.exist;
        should.not.exist(expectedOutput);
        error.should.be.error;
        error.should.have.property('message');
        error.message.should.be.string;
        error.message.should.equal('testFixture failure.');
        error.should.have.property('column');
        error.column.should.be.number;
        error.should.have.property('line');
        error.line.should.be.number;
        error.should.have.property('file');
        error.file.should.be.string;
        error.file.should.be.string;
        error.should.have.property('status');
        error.status.should.be.number;
        done();
      });
    });

    it('should ignore the output error and return the node-sass error', function(done) {
      jigsassTest.testFixture('testFixture/failureNoOutput', {}, function(error, result, expectedOutput) {
        should.not.exist(result);
        should.not.exist(expectedOutput);
        error.should.be.error;
        error.message.should.equal('testFixture failure, not an output error.');
        error.should.not.have.property('code');
        done();
      });
    });

    it('should read the output.css file of the given fixtures directory', function(done) {
      jigsassTest.testFixture('testFixture/success', {}, function(error, result, expectedOutput) {
        should.not.exist(error);
        result.should.exist;
        expectedOutput.should.be.string;
        expectedOutput.should.equal('.test {\n  content: "testFixture() test"; }\n');
        done();
      });
    });

    it('should throw an error if it cannot find output.css', function(done) {
      jigsassTest.testFixture('testFixture/missingOutput', {}, function(error, result, expectedOutput) {
        error.should.exist;
        error.code.should.equal('ENOENT');
        should.not.exist(result);
        should.not.exist(expectedOutput);
        done();
      });
    });

    it('should compare the expected result and the actual result', function(done) {
      jigsassTest.testFixture('testFixture/success', {}, function(error, result, expectedOutput) {
        should.not.exist(error);
        result.should.exist;
        result.css.should.equal(expectedOutput);
        done();
      });
    });
  });
});
