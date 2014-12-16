// Copyright (c) 2014 The Axiom Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import AxiomError from 'axiom/core/error';

import FileSystemBinding from 'axiom/bindings/fs/file_system';
import Path from 'axiom/fs/path';

import JsEntry from 'axiom/fs/js_entry';
import JsExecutable from 'axiom/fs/js_executable';
import JsResolveResult from 'axiom/fs/js_resolve_result';

/**
 * A directory in a JsFileSystem.
 *
 * A directory can contain JsEntry subclasses and/or FileSystemBindings.
 *
 * @param {JsFileSystem} jsfs  The parent file system.
 */
export var JsDirectory = function(jsfs) {
  JsEntry.call(this, jsfs, 'd');
  this.entryMap_ = new Map();
};

export default JsDirectory;

JsDirectory.prototype = Object.create(JsEntry.prototype);

/**
 * Resolve a Path object as far as possible.
 *
 * This may return a partial result which represents the depth to which
 * the path can be resolved.
 *
 * @param {Path} path An object representing the path to resolve.
 * @param {integer} opt_index The optional index into the path elements where
 *   we should start resolving.  Defaults to 0, the first path element.
 * @return {JsResolveResult}
 */
JsDirectory.prototype.resolve = function(path, opt_index) {
  var index = opt_index || 0;

  if (!this.entryExists(path.elements[index])) {
    return new JsResolveResult(
        path.elements.slice(0, index - 1),
        path.elements.slice(index - 1),
        this);
  }

  var entry = this.entryMap_.get(path.elements[index]);

  if (index == path.elements.length - 1)
    return new JsResolveResult(path.elements, null, entry);

  if (entry instanceof JsDirectory)
    return entry.resolve(path, index + 1);

  return new JsResolveResult(path.elements.slice(0, index + 1),
                             path.elements.slice(index + 1),
                             entry);
};

/**
 * Return true if the named entry exists in this directory.
 *
 * @param {string} name
 */
JsDirectory.prototype.entryExists = function(name) {
  return this.entryMap_.has(name);
};

/**
 * Link the given entry into this directory.
 *
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {string} name  A name to give the entry.
 * @param {JsEntry}
 */
JsDirectory.prototype.link = function(name, entry) {
  if (!entry instanceof JsEntry)
    throw new AxiomError.TypeMismatch('instanceof JsEntry', entry);

  if (this.entryMap_.has(name))
    throw new AxiomError.Duplicate('name', name);

  this.entryMap_.set(name, entry);
};

/**
 * Link the given FileSystemBinding into this directory.
 *
 * This method is not directly reachable through the FileSystemBinding.
 *
 * @param {string} name  A name to give the file system.
 * @param {FileSystemBinding}
 */
JsDirectory.prototype.mount = function(name, fileSystemBinding) {
  if (!fileSystemBinding instanceof FileSystemBinding) {
    throw new AxiomError.TypeMismatch('instanceof FileSystemBinding',
                                      fileSystemBinding);
  }

  if (this.entryMap_.has(name))
    throw new AxiomError.Duplicate('name', name);

  this.entryMap_.set(name, fileSystemBinding);
};

JsDirectory.prototype.install = function(executables) {
  for (var name in executables) {
    var callback = executables[name];
    var sigil;
    var ary = /([^\(]*)\(([^\)]?)\)$/.exec(name);
    if (ary) {
      name = ary[1];
      sigil = ary[2];
      if (sigil && '$@%*'.indexOf(sigil) == -1)
        throw new AxiomError.Invalid('sigil', sigil);
    } else {
      sigil = executables[name].argSigil || '*';
    }

    this.link(name, new JsExecutable(this, callback, sigil));
  }
};

/**
 * Make a new, empty directory with the given name.
 *
 * @param {string} name
 */
JsDirectory.prototype.mkdir = function(name) {
  if (this.entryExists(name))
    return Promise.reject(new AxiomError.Duplicate('name', name));

  var dir = new JsDirectory(this.jsfs);
  this.entryMap_.set(name, dir);
  return Promise.resolve(dir);
};

/**
 * Remove the entry with the given name.
 *
 * @param {string} name
 * @return {Promise<>}
 */
JsDirectory.prototype.unlink = function(name) {
  if (!this.entryExists(name))
    return Promise.reject(new AxiomError.NotFound('name', name));

  this.entryMap_.delete(name);
  return Promise.resolve();
};

/**
 * Return the stat() result for each item in this directory.
 *
 * @return {Promise<Object>}
 */
JsDirectory.prototype.list = function() {
  var rv = {};
  var promises = [];

  this.entryMap_.forEach(function(entry, name) {
    var promise;

    if (entry instanceof FileSystemBinding) {
      promise = entry.stat('/');
    } else {
      promise = entry.stat();
    }

    promises.push(promise.then(function(statResult) {
      rv[name] = statResult;
    }));
  });

  return Promise.all(promises).then(function() {
    return rv;
  });
};

/**
 * Return the stat() result for this directory.
 */
JsDirectory.prototype.stat = function() {
  return JsEntry.prototype.stat.call(this).then(
      function(rv) {
        rv['count'] = this.entryMap_.size;
        return Promise.resolve(rv);
      }.bind(this));
};