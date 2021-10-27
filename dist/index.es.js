function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;

  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }

  return target;
}

var makeOptions = function makeOptions(opts) {
  if (opts === void 0) {
    opts = {};
  }

  return {
    arrayFormat: opts.arrayFormat || 'none',
    booleanFormat: opts.booleanFormat || 'none',
    nullFormat: opts.nullFormat || 'default'
  };
};

var encodeValue = function encodeValue(value) {
  return encodeURIComponent(value);
};

var decodeValue = function decodeValue(value) {
  return decodeURIComponent(value.replace(/\+/g, ' '));
};

var encodeBoolean = function encodeBoolean(name, value, opts) {
  if (opts.booleanFormat === 'empty-true' && value) {
    return name;
  }

  var encodedValue;

  if (opts.booleanFormat === 'unicode') {
    encodedValue = value ? '✓' : '✗';
  } else {
    encodedValue = value.toString();
  }

  return name + "=" + encodedValue;
};

var encodeNull = function encodeNull(name, opts) {
  if (opts.nullFormat === 'hidden') {
    return '';
  }

  if (opts.nullFormat === 'string') {
    return name + "=null";
  }

  return name;
};

var getNameEncoder = function getNameEncoder(opts) {
  if (opts.arrayFormat === 'index') {
    return function (name, index) {
      return name + "[" + index + "]";
    };
  }

  if (opts.arrayFormat === 'brackets') {
    return function (name) {
      return name + "[]";
    };
  }

  return function (name) {
    return name;
  };
};

var encodeArray = function encodeArray(name, arr, opts) {
  var encodeName = getNameEncoder(opts);
  return arr.map(function (val, index) {
    return encodeName(name, index) + "=" + encodeValue(val);
  }).join('&');
};

var encode = function encode(name, value, opts) {
  var encodedName = encodeValue(name);

  if (value === null) {
    return encodeNull(encodedName, opts);
  }

  if (typeof value === 'boolean') {
    return encodeBoolean(encodedName, value, opts);
  }

  if (Array.isArray(value)) {
    return encodeArray(encodedName, value, opts);
  }

  return encodedName + "=" + encodeValue(value);
};

var decode = function decode(value, opts) {
  if (value === undefined) {
    return opts.booleanFormat === 'empty-true' ? true : null;
  }

  if (opts.booleanFormat === 'string') {
    if (value === 'true') {
      return true;
    }

    if (value === 'false') {
      return false;
    }
  }

  if (opts.nullFormat === 'string') {
    if (value === 'null') {
      return null;
    }
  }

  var decodedValue = decodeValue(value);

  if (opts.booleanFormat === 'unicode') {
    if (decodedValue === '✓') {
      return true;
    }

    if (decodedValue === '✗') {
      return false;
    }
  }

  return decodedValue;
};

var getSearch = function getSearch(path) {
  var pos = path.indexOf('?');

  if (pos === -1) {
    return path;
  }

  return path.slice(pos + 1);
};

var isSerialisable = function isSerialisable(val) {
  return val !== undefined;
};

var parseName = function parseName(name) {
  var bracketPosition = name.indexOf('[');
  var hasBrackets = bracketPosition !== -1;
  return {
    hasBrackets: hasBrackets,
    name: hasBrackets ? name.slice(0, bracketPosition) : name
  };
};
/**
 * Parse a querystring and return an object of parameters
 */


var parse = function parse(path, opts) {
  var options = makeOptions(opts);
  return getSearch(path).split('&').reduce(function (params, param) {
    var _a = param.split('='),
        rawName = _a[0],
        value = _a[1];

    var _b = parseName(rawName),
        hasBrackets = _b.hasBrackets,
        name = _b.name;

    var decodedName = decodeValue(name);
    var currentValue = params[name];
    var decodedValue = decode(value, options);

    if (currentValue === undefined) {
      params[decodedName] = hasBrackets ? [decodedValue] : decodedValue;
    } else {
      params[decodedName] = (Array.isArray(currentValue) ? currentValue : [currentValue]).concat(decodedValue);
    }

    return params;
  }, {});
};
/**
 * Build a querystring from an object of parameters
 */


var build = function build(params, opts) {
  var options = makeOptions(opts);
  return Object.keys(params).filter(function (paramName) {
    return isSerialisable(params[paramName]);
  }).map(function (paramName) {
    return encode(paramName, params[paramName], options);
  }).filter(Boolean).join('&');
};
/**
 * Remove a list of parameters from a querystring
 */


var omit = function omit(path, paramsToOmit, opts) {
  var options = makeOptions(opts);
  var searchPart = getSearch(path);

  if (searchPart === '') {
    return {
      querystring: '',
      removedParams: {}
    };
  }

  var _a = path.split('&').reduce(function (_a, chunk) {
    var left = _a[0],
        right = _a[1];
    var rawName = chunk.split('=')[0];
    var name = parseName(rawName).name;
    return paramsToOmit.indexOf(name) === -1 ? [left.concat(chunk), right] : [left, right.concat(chunk)];
  }, [[], []]),
      kept = _a[0],
      removed = _a[1];

  return {
    querystring: kept.join('&'),
    removedParams: parse(removed.join('&'), options)
  };
};

/**
 * We encode using encodeURIComponent but we want to
 * preserver certain characters which are commonly used
 * (sub delimiters and ':')
 *
 * https://www.ietf.org/rfc/rfc3986.txt
 *
 * reserved    = gen-delims / sub-delims
 *
 * gen-delims  = ":" / "/" / "?" / "#" / "[" / "]" / "@"
 *
 * sub-delims  = "!" / "$" / "&" / "'" / "(" / ")"
              / "*" / "+" / "," / ";" / "="
 */
var excludeSubDelimiters = /[^!$'()*+,;|:]/g;
var encodeURIComponentExcludingSubDelims = function encodeURIComponentExcludingSubDelims(segment) {
  return segment.replace(excludeSubDelimiters, function (match) {
    return encodeURIComponent(match);
  });
};
var encodingMethods = {
  default: encodeURIComponentExcludingSubDelims,
  uri: encodeURI,
  uriComponent: encodeURIComponent,
  none: function none(val) {
    return val;
  },
  legacy: encodeURI
};
var decodingMethods = {
  default: decodeURIComponent,
  uri: decodeURI,
  uriComponent: decodeURIComponent,
  none: function none(val) {
    return val;
  },
  legacy: decodeURIComponent
};
var encodeParam = function encodeParam(param, encoding, isSpatParam) {
  var encoder = encodingMethods[encoding] || encodeURIComponentExcludingSubDelims;

  if (isSpatParam) {
    return String(param).split('/').map(encoder).join('/');
  }

  return encoder(String(param));
};
var decodeParam = function decodeParam(param, encoding) {
  return (decodingMethods[encoding] || decodeURIComponent)(param);
};

var defaultOrConstrained = function defaultOrConstrained(match) {
  return '(' + (match ? match.replace(/(^<|>$)/g, '') : "[a-zA-Z0-9-_.~%':|=+\\*@$]+") + ')';
};
var rules = [{
  name: 'url-parameter',
  pattern: /^:([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})(<(.+?)>)?/,
  regex: function regex(match) {
    return new RegExp(defaultOrConstrained(match[2]));
  }
}, {
  name: 'url-parameter-splat',
  pattern: /^\*([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})/,
  regex: /([^?]*)/
}, {
  name: 'url-parameter-matrix',
  pattern: /^;([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})(<(.+?)>)?/,
  regex: function regex(match) {
    return new RegExp(';' + match[1] + '=' + defaultOrConstrained(match[2]));
  }
}, {
  name: 'query-parameter',
  pattern: /^(?:\?|&)(?::)?([a-zA-Z0-9-_]*[a-zA-Z0-9]{1})/
}, {
  name: 'delimiter',
  pattern: /^(\/|\?)/,
  regex: function regex(match) {
    return new RegExp('\\' + match[0]);
  }
}, {
  name: 'sub-delimiter',
  pattern: /^(!|&|-|_|\.|;)/,
  regex: function regex(match) {
    return new RegExp(match[0]);
  }
}, {
  name: 'fragment',
  pattern: /^([0-9a-zA-Z]+)/,
  regex: function regex(match) {
    return new RegExp(match[0]);
  }
}];

var tokenise = function tokenise(str, tokens) {
  if (tokens === void 0) {
    tokens = [];
  }

  // Look for a matching rule
  var matched = rules.some(function (rule) {
    var match = str.match(rule.pattern);

    if (!match) {
      return false;
    }

    tokens.push({
      type: rule.name,
      match: match[0],
      val: match.slice(1, 2),
      otherVal: match.slice(2),
      regex: rule.regex instanceof Function ? rule.regex(match) : rule.regex
    });

    if (match[0].length < str.length) {
      tokens = tokenise(str.substr(match[0].length), tokens);
    }

    return true;
  }); // If no rules matched, throw an error (possible malformed path)

  if (!matched) {
    throw new Error("Could not parse path '" + str + "'");
  }

  return tokens;
};

var exists = function exists(val) {
  return val !== undefined && val !== null;
};

var optTrailingSlash = function optTrailingSlash(source, strictTrailingSlash) {
  if (strictTrailingSlash) {
    return source;
  }

  if (source === '\\/') {
    return source;
  }

  return source.replace(/\\\/$/, '') + '(?:\\/)?'; // need for testing of `/my-path/` path, when source is `/my-path` and trailingSlash is optional
};

var upToDelimiter = function upToDelimiter(source) {
  return /(\/)$/.test(source) ? source : source + '(\\/|\\?|\\.|;|$)';
};

var appendQueryParam = function appendQueryParam(params, param, val) {
  if (val === void 0) {
    val = '';
  }

  var existingVal = params[param];

  if (existingVal === undefined) {
    params[param] = val;
  } else {
    params[param] = Array.isArray(existingVal) ? existingVal.concat(val) : [existingVal, val];
  }

  return params;
};

var defaultOptions = {
  urlParamsEncoding: 'default'
};
var Path = /*#__PURE__*/function () {
  Path.createPath = function createPath(path, options) {
    return new Path(path, options);
  };

  function Path(path, options) {
    this.path = void 0;
    this.tokens = void 0;
    this.hasUrlParams = void 0;
    this.hasSpatParam = void 0;
    this.hasMatrixParams = void 0;
    this.hasQueryParams = void 0;
    this.options = void 0;
    this.spatParams = void 0;
    this.urlParams = void 0;
    this.queryParams = void 0;
    this.params = void 0;
    this.source = void 0;

    if (!path) {
      throw new Error('Missing path in Path constructor');
    }

    this.path = path;
    this.options = _extends({}, defaultOptions, options);
    this.tokens = tokenise(path);
    this.hasUrlParams = this.tokens.filter(function (t) {
      return /^url-parameter/.test(t.type);
    }).length > 0;
    this.hasSpatParam = this.tokens.filter(function (t) {
      return /splat$/.test(t.type);
    }).length > 0;
    this.hasMatrixParams = this.tokens.filter(function (t) {
      return /matrix$/.test(t.type);
    }).length > 0;
    this.hasQueryParams = this.tokens.filter(function (t) {
      return /^query-parameter/.test(t.type);
    }).length > 0; // Extract named parameters from tokens

    this.spatParams = this.getParams('url-parameter-splat');
    this.urlParams = this.getParams(/^url-parameter/); // Query params

    this.queryParams = this.getParams('query-parameter'); // All params

    this.params = this.urlParams.concat(this.queryParams); // Check if hasQueryParams
    // Regular expressions for url part only (full and partial match)

    this.source = this.tokens.filter(function (t) {
      return t.regex !== undefined;
    }).map(function (t) {
      return t.regex.source;
    }).join('');
  }

  var _proto = Path.prototype;

  _proto.isQueryParam = function isQueryParam(name) {
    return this.queryParams.indexOf(name) !== -1;
  };

  _proto.isSpatParam = function isSpatParam(name) {
    return this.spatParams.indexOf(name) !== -1;
  };

  _proto.test = function test(path, opts) {
    var _this = this;

    var options = _extends({
      caseSensitive: false,
      strictTrailingSlash: false
    }, this.options, opts);

    var source = optTrailingSlash(this.source, options.strictTrailingSlash); // Check if exact match

    var match = this.urlTest(path, source + (this.hasQueryParams ? '(\\?.*$|$)' : '$'), options.caseSensitive, options.urlParamsEncoding); // If no match, or no query params, no need to go further

    if (!match || !this.hasQueryParams) {
      return match;
    } // Extract query params


    var queryParams = parse(path, options.queryParamFormats);
    var unexpectedQueryParams = Object.keys(queryParams).filter(function (p) {
      return !_this.isQueryParam(p);
    });

    if (unexpectedQueryParams.length === 0) {
      // Extend url match
      Object.keys(queryParams).forEach( // @ts-ignore
      function (p) {
        return match[p] = queryParams[p];
      });
      return match;
    }

    return null;
  };

  _proto.partialTest = function partialTest(path, opts) {
    var _this2 = this;

    var options = _extends({
      caseSensitive: false,
      strictTrailingSlash: false
    }, this.options, opts); // Check if partial match (start of given path matches regex)


    var source = upToDelimiter(optTrailingSlash(this.source, options.strictTrailingSlash));
    var match = this.urlTest(path, source, options.caseSensitive, options.urlParamsEncoding);

    if (!match) {
      return match;
    }

    if (!this.hasQueryParams) {
      return match;
    }

    var queryParams = parse(path, options.queryParamFormats);
    Object.keys(queryParams).filter(function (p) {
      return _this2.isQueryParam(p);
    }).forEach(function (p) {
      return appendQueryParam(match, p, queryParams[p]);
    });
    return match;
  };

  _proto.build = function build$1(params, opts) {
    var _this3 = this;

    if (params === void 0) {
      params = {};
    }

    var options = _extends({
      ignoreConstraints: false,
      ignoreSearch: false,
      queryParamFormats: {}
    }, this.options, opts);

    var _options$trailingSlas = options.trailingSlashMode,
        trailingSlashMode = _options$trailingSlas === void 0 ? 'default' : _options$trailingSlas;
    var encodedUrlParams = Object.keys(params).filter(function (p) {
      return !_this3.isQueryParam(p);
    }).reduce(function (acc, key) {
      if (!exists(params[key])) {
        return acc;
      }

      var val = params[key];

      var isSpatParam = _this3.isSpatParam(key);

      if (typeof val === 'boolean') {
        acc[key] = val;
      } else if (Array.isArray(val)) {
        acc[key] = val.map(function (v) {
          return encodeParam(v, options.urlParamsEncoding, isSpatParam);
        });
      } else {
        acc[key] = encodeParam(val, options.urlParamsEncoding, isSpatParam);
      }

      return acc;
    }, {}); // Check all params are provided (not search parameters which are optional)

    if (this.urlParams.some(function (p) {
      return !exists(params[p]);
    })) {
      var missingParameters = this.urlParams.filter(function (p) {
        return !exists(params[p]);
      });
      throw new Error("Cannot build path: '" + this.path + "' requires missing parameters { " + missingParameters.join(', ') + ' }');
    } // Check constraints


    if (!options.ignoreConstraints) {
      var constraintsPassed = this.tokens.filter(function (t) {
        return /^url-parameter/.test(t.type) && !/-splat$/.test(t.type);
      }).every(function (t) {
        return new RegExp('^' + defaultOrConstrained(t.otherVal[0]) + '$').test(encodedUrlParams[t.val]);
      });

      if (!constraintsPassed) {
        throw new Error("Some parameters of '" + this.path + "' are of invalid format");
      }
    }

    var base = this.tokens.filter(function (t, i, a) {
      if (trailingSlashMode === 'never' && i === a.length - 1 && t.type === 'delimiter') {
        return false;
      }

      return /^query-parameter/.test(t.type) === false;
    }).map(function (t, i, a) {
      if (t.type === 'url-parameter-matrix') {
        return ";" + t.val + "=" + encodedUrlParams[t.val[0]];
      }

      if (/^url-parameter/.test(t.type)) {
        return encodedUrlParams[t.val[0]];
      }

      if (trailingSlashMode === 'always' && i === a.length - 1 && t.type !== 'delimiter') {
        return t.match + '/';
      }

      return t.match;
    }).join('');

    if (options.ignoreSearch) {
      return base;
    }

    var searchParams = this.queryParams.filter(function (p) {
      return Object.keys(params).indexOf(p) !== -1;
    }).reduce(function (sparams, paramName) {
      sparams[paramName] = params[paramName];
      return sparams;
    }, {});
    var searchPart = build(searchParams, options.queryParamFormats);
    return searchPart ? base + '?' + searchPart : base;
  };

  _proto.getParams = function getParams(type) {
    var predicate = type instanceof RegExp ? function (t) {
      return type.test(t.type);
    } : function (t) {
      return t.type === type;
    };
    return this.tokens.filter(predicate).map(function (t) {
      return t.val[0];
    });
  };

  _proto.urlTest = function urlTest(path, source, caseSensitive, urlParamsEncoding) {
    var _this4 = this;

    var regex = new RegExp('^' + source, caseSensitive ? '' : 'i');
    var match = path.match(regex);

    if (!match) {
      return null;
    }

    if (!this.urlParams.length) {
      return {};
    } // Reduce named params to key-value pairs


    return match.slice(1, this.urlParams.length + 1).reduce(function (params, m, i) {
      params[_this4.urlParams[i]] = decodeParam(m, urlParamsEncoding);
      return params;
    }, {});
  };

  return Path;
}();

function _createForOfIteratorHelperLoose$5(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$5(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray$5(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$5(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$5(o, minLen); }

function _arrayLikeToArray$5(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
var getMetaFromNodes = function getMetaFromNodes(nodes) {
  var accName = '';
  var meta = {
    params: {}
  };
  meta.params = nodes.reduce(function (params, node) {
    var _node$parser$urlParam, _node$parser, _node$parser$queryPar, _node$parser2;

    if (!node.parser) {
      return params;
    } //TODO: we already checking presense of parser, do we need fallbacks ?


    var urlParams = (_node$parser$urlParam = (_node$parser = node.parser) == null ? void 0 : _node$parser.urlParams.reduce(function (params, p) {
      params[p] = 'url';
      return params;
    }, {})) != null ? _node$parser$urlParam : {};
    var allParams = (_node$parser$queryPar = (_node$parser2 = node.parser) == null ? void 0 : _node$parser2.queryParams.reduce(function (params, p) {
      params[p] = 'query';
      return params;
    }, urlParams)) != null ? _node$parser$queryPar : {};

    if (node.name !== undefined) {
      accName = accName ? accName + '.' + node.name : node.name;
      params[accName] = allParams;
    }

    return params;
  }, {});
  return meta;
};
var buildStateFromMatch = function buildStateFromMatch(match) {
  if (!match || !match.nodes || !match.nodes.length) {
    return null;
  }

  var name = match.nodes.map(function (nade) {
    return nade.name;
  }).filter(function (name) {
    return name;
  }).join('.');
  var params = match.params;
  return {
    name: name,
    params: params,
    meta: getMetaFromNodes(match.nodes)
  };
};
var buildPathFromNodes = function buildPathFromNodes(nodes, params, options) {
  if (params === void 0) {
    params = {};
  }

  if (options === void 0) {
    options = {};
  }

  var _options = options,
      _options$queryParamsM = _options.queryParamsMode,
      queryParamsMode = _options$queryParamsM === void 0 ? 'default' : _options$queryParamsM,
      _options$trailingSlas = _options.trailingSlashMode,
      trailingSlashMode = _options$trailingSlas === void 0 ? 'default' : _options$trailingSlas;
  var searchParams = [];
  var nonSearchParams = [];

  for (var _iterator = _createForOfIteratorHelperLoose$5(nodes), _step; !(_step = _iterator()).done;) {
    var node = _step.value;
    var parser = node.parser;

    if (parser) {
      searchParams.push.apply(searchParams, parser.queryParams);
      nonSearchParams.push.apply(nonSearchParams, parser.urlParams);
      nonSearchParams.push.apply(nonSearchParams, parser.spatParams);
    }
  }

  if (queryParamsMode === 'loose') {
    var extraParams = Object.keys(params).reduce(function (acc, p) {
      return searchParams.indexOf(p) === -1 && nonSearchParams.indexOf(p) === -1 ? acc.concat(p) : acc;
    }, []);
    searchParams.push.apply(searchParams, extraParams);
  }

  var searchParamsObject = searchParams.reduce(function (acc, paramName) {
    if (Object.keys(params).indexOf(paramName) !== -1) {
      acc[paramName] = params[paramName];
    }

    return acc;
  }, {});
  var searchPart = build(searchParamsObject, options.queryParamFormats);
  var path = nodes.reduce(function (path, node) {
    var _node$parser$build, _node$parser3;

    var nodePath = (_node$parser$build = (_node$parser3 = node.parser) == null ? void 0 : _node$parser3.build(params, {
      ignoreSearch: true,
      queryParamFormats: options.queryParamFormats,
      urlParamsEncoding: options.urlParamsEncoding
    })) != null ? _node$parser$build : '';
    return node.absolute ? nodePath : path + nodePath;
  }, '') // remove repeated slashes
  .replace(/\/\/{1,}/g, '/');
  var finalPath = path;

  if (trailingSlashMode === 'always') {
    finalPath = /\/$/.test(path) ? path : path + "/";
  } else if (trailingSlashMode === 'never' && path !== '/') {
    finalPath = /\/$/.test(path) ? path.slice(0, -1) : path;
  }

  return finalPath + (searchPart ? '?' + searchPart : '');
};
var getPathFromNodes = function getPathFromNodes(nodes) {
  return nodes ? nodes.map(function (node) {
    return node.path;
  }).join('') : null;
};
var sortedNameMap = function sortedNameMap(originalMap) {
  var sortedArray = [];

  for (var _iterator2 = _createForOfIteratorHelperLoose$5(originalMap.entries()), _step2; !(_step2 = _iterator2()).done;) {
    var pair = _step2.value;
    sortedArray.push(pair);
  }

  sortedArray.sort(sortFunc([].concat(sortedArray)));
  return new Map(sortedArray);
};
var sortFunc = function sortFunc(original) {
  return function (left, right) {
    var _leftNode$parser, _rightNode$parser, _leftNode$parser$urlP, _leftNode$parser2, _rightNode$parser$url, _rightNode$parser2;

    var leftNode = left[1];
    var rightNode = right[1];
    var leftPath = leftNode.path.replace(/<.*?>/g, '').split('?')[0].replace(/(.+)\/$/, '$1');
    var rightPath = rightNode.path.replace(/<.*?>/g, '').split('?')[0].replace(/(.+)\/$/, '$1'); // '/' last

    if (leftPath === '/') {
      return 1;
    }

    if (rightPath === '/') {
      return -1;
    } // Spat params last


    if ((_leftNode$parser = leftNode.parser) != null && _leftNode$parser.hasSpatParam) {
      return 1;
    }

    if ((_rightNode$parser = rightNode.parser) != null && _rightNode$parser.hasSpatParam) {
      return -1;
    } // No spat, number of segments (less segments last)


    var leftSegments = (leftPath.match(/\//g) || []).length;
    var rightSegments = (rightPath.match(/\//g) || []).length;

    if (leftSegments < rightSegments) {
      return 1;
    }

    if (leftSegments > rightSegments) {
      return -1;
    } // Same number of segments, number of URL params ascending


    var leftParamsCount = (_leftNode$parser$urlP = (_leftNode$parser2 = leftNode.parser) == null ? void 0 : _leftNode$parser2.urlParams.length) != null ? _leftNode$parser$urlP : 0;
    var rightParamsCount = (_rightNode$parser$url = (_rightNode$parser2 = rightNode.parser) == null ? void 0 : _rightNode$parser2.urlParams.length) != null ? _rightNode$parser$url : 0;

    if (leftParamsCount < rightParamsCount) {
      return -1;
    }

    if (leftParamsCount > rightParamsCount) {
      return 1;
    } // Same number of segments and params, last segment length descending


    var leftParamLength = (leftPath.split('/').slice(-1)[0] || '').length;
    var rightParamLength = (rightPath.split('/').slice(-1)[0] || '').length;

    if (leftParamLength < rightParamLength) {
      return 1;
    }

    if (leftParamLength > rightParamLength) {
      return -1;
    } // Same last segment length, preserve definition order. Note that we
    // cannot just return 0, as sort is not guaranteed to be a stable sort.


    return original.indexOf(left) - original.indexOf(right);
  };
};

function _createForOfIteratorHelperLoose$4(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$4(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray$4(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$4(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$4(o, minLen); }

function _arrayLikeToArray$4(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

var splitPath = function splitPath(path) {
  var result = path.split('?');
  return [result[0], result[1] || ''];
};

var matchChildren = function matchChildren(nodes, path, options) {
  if (options === void 0) {
    options = {};
  }

  var _options = options,
      _options$queryParamsM = _options.queryParamsMode,
      queryParamsMode = _options$queryParamsM === void 0 ? 'default' : _options$queryParamsM,
      _options$strictTraili = _options.strictTrailingSlash,
      strictTrailingSlash = _options$strictTraili === void 0 ? false : _options$strictTraili,
      _options$caseSensitiv = _options.caseSensitive,
      caseSensitive = _options$caseSensitiv === void 0 ? false : _options$caseSensitiv;
  var currentMatch = {
    nodes: [],
    params: {}
  };
  var search;

  var _splitPath = splitPath(path);

  path = _splitPath[0];
  search = _splitPath[1];
  var processNextNodes = true;
  var consumed;

  while (processNextNodes) {
    processNextNodes = false;

    var _loop = function _loop() {
      var node = _step.value;
      var match = null;
      var noChildren = node.nameMap.size === 0;
      var trailingSlashMode = noChildren ? strictTrailingSlash ? 'default' : 'never' : 'default';

      if (consumed === '/') {
        if (node.path[0] === '/' && path[0] !== '/') {
          path = '/' + path;
        } else if (node.path[0] !== '/' && path[0] === '/') {
          path = path.slice(1);
        }
      } // Partially match remaining path segment


      match = node.parser.partialTest(search ? path + "?" + search : path, {
        caseSensitive: caseSensitive,
        queryParamFormats: options.queryParamFormats,
        urlParamsEncoding: options.urlParamsEncoding,
        strictTrailingSlash: strictTrailingSlash
      });
      if (match == null) return "continue"; // Save our matched node annd params

      currentMatch.nodes.push(node);
      Object.keys(match).forEach(function (param) {
        return currentMatch.params[param] = match[param];
      }); // Getting consumed segment from a path

      consumed = node.parser.build(match, {
        ignoreSearch: true,
        urlParamsEncoding: options.urlParamsEncoding,
        trailingSlashMode: trailingSlashMode
      }); // remove consumed segment from a path
      // Remove url-query params owned by this node from the remaining path, all is left will be placed in the `querystring` variable.

      path = path.slice(consumed.length);
      search = omit(search, node.parser.queryParams, options.queryParamFormats).querystring;

      if (!strictTrailingSlash && path === '/' && !/\/$/.test(consumed)) {
        path = '';
      }

      if (!strictTrailingSlash && !noChildren && path === '') {
        path = '/';
      } // Fully matched, withdraw


      if (!path.length && !search.length) {
        return {
          v: currentMatch
        };
      } // Path is matched, search params are not,
      // non strict mode and some unmatched queryParams is left, save them into a match object, then withdraw


      if (queryParamsMode !== 'strict' && path.length === 0 && search.length !== 0) {
        var remainingQueryParams = parse(search, options.queryParamFormats);
        Object.keys(remainingQueryParams).forEach(function (name) {
          return currentMatch.params[name] = remainingQueryParams[name];
        });
        return {
          v: currentMatch
        };
      } /////


      nodes = node.nameMap;
      processNextNodes = true;
      return "break";
    };

    for (var _iterator = _createForOfIteratorHelperLoose$4(nodes.values()), _step; !(_step = _iterator()).done;) {
      var _ret = _loop();

      if (_ret === "continue") continue;
      if (_ret === "break") break;
      if (typeof _ret === "object") return _ret.v;
    }
  }

  return null;
};

var _excluded$5 = ["name", "path", "children", "options"],
    _excluded2$1 = ["name", "path", "children"];

function _createForOfIteratorHelperLoose$3(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$3(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray$3(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$3(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$3(o, minLen); }

function _arrayLikeToArray$3(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
var trailingSlash = /(.+?)(\/)(\?.*$|$)/gim;
var RouteNode = /*#__PURE__*/function () {
  function RouteNode(_ref) {
    var _ref$name = _ref.name,
        name = _ref$name === void 0 ? '' : _ref$name,
        _ref$path = _ref.path,
        path = _ref$path === void 0 ? '' : _ref$path,
        _ref$children = _ref.children,
        children = _ref$children === void 0 ? [] : _ref$children,
        _ref$options = _ref.options,
        options = _ref$options === void 0 ? {
      sort: true
    } : _ref$options,
        augments = _objectWithoutPropertiesLoose(_ref, _excluded$5);

    this['constructor'] = void 0;
    this.name = void 0;
    this.treeNames = void 0;
    this.path = void 0;
    this.absolute = void 0;
    this.parser = void 0;
    this.nameMap = void 0;
    this.masterNode = void 0;
    this.isRoot = void 0;
    this.name = name;
    this.treeNames = [];
    this.absolute = /^~/.test(path);
    this.path = this.absolute ? path.slice(1) : path;
    this.parser = this.path ? new Path(this.path) : null;
    this.isRoot = !name || !path;
    this.nameMap = new Map();
    this.masterNode = this;

    if (augments) {
      Object.assign(this, augments);
    }

    this.add(children, false);
    if (options.sort) this.reflow();
    return this;
  }
  /**
   * Probably you wanna sort parrent childs after changing the path ?
   * @param path
   */


  var _proto = RouteNode.prototype;

  _proto.setPath = function setPath(path) {
    if (path === void 0) {
      path = '';
    }

    this.path = path;
    this.parser = path ? new Path(path) : null;
  }
  /**
   *
   * @param route
   * @param {boolean} sort: be careful with sort, without sorting router will not work correctly
   * @returns
   */
  ;

  _proto.add = function add(route, sort) {
    var _this = this;

    if (sort === void 0) {
      sort = true;
    }

    if (route === undefined || route === null) {
      return this;
    }

    if (route instanceof Array) {
      if (route.length === 0) return this;
      route.forEach(function (r) {
        return _this.add(r, false);
      });
      if (sort) this.reflow();
      return this;
    }

    if (!(route instanceof Object)) {
      throw new Error('RouteNode.add() expects routes to be an Object at least.');
    }

    var node; // If route is some object and not instance of RouteNode class, we should build correct instance from it

    if (!(route instanceof RouteNode)) {
      var name = route.name,
          path = route.path,
          _route$children = route.children,
          children = _route$children === void 0 ? [] : _route$children,
          extra = _objectWithoutPropertiesLoose(route, _excluded2$1);

      node = new this.constructor(_extends({
        name: name,
        path: path,
        children: children,
        options: {
          sort: false
        }
      }, extra));
    } else {
      node = route;
    } // Check if instance is corect one, do not allow mixed instance, will be chaotic otherwise


    if (!(node instanceof this.constructor)) {
      throw new Error('RouteNode.add() expects routes to be the same instance as the parrent node.');
    }

    if (node.isRoot) {
      if (node.nameMap.size === 0) {
        throw new Error('RouteNode.add() expects routes to have a name and a path, or at least have some children to steal');
      }

      node.nameMap.forEach(function (node) {
        _this.addRouteNode(node);
      });
      if (sort) this.reflow(false);
      return this;
    }

    this.addRouteNode(node);
    if (sort) this.reflow();
    return this;
  };

  _proto.addRouteNode = function addRouteNode(node) {
    // If node have trailing slash, remove it, cause parents can't have trailing slashes.
    // Only exception is `/` path
    if (trailingSlash.test(this.path)) {
      this.path = this.path.replace(trailingSlash, '$1$3');
      this.parser = this.path ? new Path(this.path) : null;
    } // Move absolute node under control of `rootNode`


    if (node.absolute && this !== this.masterNode) {
      this.masterNode.addRouteNode(node);
      return this;
    } // `route` have childs, some of them are absolute ?
    // move them under control of `rootNode`


    var deferredSort = false;

    for (var _iterator = _createForOfIteratorHelperLoose$3(node.nameMap.entries()), _step; !(_step = _iterator()).done;) {
      var _step$value = _step.value,
          childName = _step$value[0],
          _childNode = _step$value[1];

      if (_childNode.absolute) {
        node.nameMap.delete(childName);
        this.masterNode.addRouteNode(_childNode);
        deferredSort = true;
      }
    } // After moving all nodes under controll of rootNode, we should sort them


    if (deferredSort) {
      this.masterNode.sortChildren();
    } // Process with attempt to add `route` as a child of this node


    var names = node.name.split('.');

    if (names.length === 1) {
      // Check if name already defined
      if (this.nameMap.has(node.name) && this.nameMap.get(node.name) !== node) {
        throw new Error("Name \"" + node.name + "\" is already defined as children of this node(\"" + this.name + "\"), will not overwrite");
      } // Check if path already defined somewhere inside child nodes


      for (var _iterator2 = _createForOfIteratorHelperLoose$3(this.nameMap.values()), _step2; !(_step2 = _iterator2()).done;) {
        var childNode = _step2.value;

        if (childNode.path === node.path && childNode !== node) {
          throw new Error("Path \"" + node.path + "\" is already defined as children of this node(\"" + this.name + "\"), will not overwrite");
        }
      } // if (this.pathMap.has(route.path) && this.pathMap.get(route.path) !== route) {
      //     throw new Error(`Path "${route.path}" is already defined in this node: "${this.name}", will not overwrite`);
      // }
      // if (this.nameMap.get(route.name) === route && this.pathMap.get(route.path) === route) {


      if (this.nameMap.get(node.name) === node) {
        // Already defined, no point in redefining the same node on the same name and path
        return this;
      }

      this.nameMap.set(node.name, node);

      if (node.absolute && this.parser && (this.parser.hasUrlParams || this.parser.hasSpatParam || this.parser.hasMatrixParams || this.parser.hasQueryParams)) {
        console.warn("Absolute child-Node was placed under Node that have params in their path, be sure that this child-node will migrate to another node, node: " + this.name + ", child-node: " + node.name);
      }

      node.propagateMaster(this);
    } else {
      // Locate parent node,`route.name` should already be descendant of this node.
      var nodes = this.getNodesByName(names.slice(0, -1).join('.'));

      if (nodes) {
        node.name = names[names.length - 1];
        nodes[nodes.length - 1].addRouteNode(node);
      } else {
        throw new Error("Could not add route named '" + node.name + "', parent is missing.");
      }
    }

    return this;
  };

  _proto.reflow = function reflow(deepSort) {
    if (deepSort === void 0) {
      deepSort = true;
    }

    if (deepSort) {
      this.sortDescendants();
    } else {
      this.sortChildren();
    }

    this.masterNode.resetTreeNames();
    this.masterNode.rebuildTreeNames();
  };

  _proto.propagateMaster = function propagateMaster(node) {
    this.masterNode = node;

    for (var _iterator3 = _createForOfIteratorHelperLoose$3(this.nameMap.values()), _step3; !(_step3 = _iterator3()).done;) {
      var _node = _step3.value;

      _node.propagateMaster(_node);
    }
  };

  _proto.resetTreeNames = function resetTreeNames() {
    this.treeNames = [];

    for (var _iterator4 = _createForOfIteratorHelperLoose$3(this.nameMap.values()), _step4; !(_step4 = _iterator4()).done;) {
      var node = _step4.value;
      node.resetTreeNames();
    }
  };

  _proto.rebuildTreeNames = function rebuildTreeNames(parrentNames) {
    var _this2 = this;

    if (parrentNames === void 0) {
      parrentNames = [];
    }

    var treeNames = [];

    if (parrentNames.length === 0 && this.name !== '') {
      treeNames.push(this.name);
    } else {
      parrentNames.forEach(function (treeName) {
        treeNames.push(treeName + "." + _this2.name);
      });
    }

    this.treeNames = this.treeNames.concat(treeNames); // Update childrens

    for (var _iterator5 = _createForOfIteratorHelperLoose$3(this.nameMap.values()), _step5; !(_step5 = _iterator5()).done;) {
      var node = _step5.value;
      node.rebuildTreeNames(treeNames);
    }
  };

  _proto.getPath = function getPath(routeName) {
    var nodesByName = this.getNodesByName(routeName);
    return nodesByName ? getPathFromNodes(nodesByName) : null;
  };

  _proto.sortChildren = function sortChildren() {
    if (!this.nameMap.size) return;
    this.nameMap = sortedNameMap(this.nameMap);
  };

  _proto.sortDescendants = function sortDescendants() {
    this.sortChildren();

    for (var _iterator6 = _createForOfIteratorHelperLoose$3(this.nameMap.values()), _step6; !(_step6 = _iterator6()).done;) {
      var childNode = _step6.value;
      childNode.sortDescendants();
    }
  };

  _proto.buildPath = function buildPath(name, params, options) {
    if (params === void 0) {
      params = {};
    }

    if (options === void 0) {
      options = {};
    }

    var nodes = this.getNodesByName(name);

    if (!nodes) {
      throw new Error("[route-node][buildPath] \"" + name + "\" is not defined");
    }

    if (this.parser) {
      nodes.splice(0, 0, this);
    }

    return buildPathFromNodes(nodes, params, options);
  };

  _proto.buildState = function buildState(name, params) {
    if (params === void 0) {
      params = {};
    }

    var nodes = this.getNodesByName(name);

    if (!nodes || !nodes.length) {
      return null;
    }

    if (this.parser) {
      nodes.splice(0, 0, this);
    }

    return {
      name: name,
      params: params,
      meta: getMetaFromNodes(nodes)
    };
  }
  /**
   * Get LIST of nodes by full name, like `en.user.orders`
   * @param name
   * @returns RouteNode[]
   */
  ;

  _proto.getNodesByName = function getNodesByName(name) {
    var result = [];
    var scanNode = this;
    var matched = name.split('.').every(function (name) {
      var subNode = scanNode.nameMap.get(name);
      if (subNode === undefined) return false;
      result.push(subNode);
      scanNode = subNode;
      return true;
    });
    return matched ? result : null;
  }
  /**
   * get ONE node by full name of the node, like `en.user.orders`
   * @param name
   * @returns RouteNode
   */
  ;

  _proto.getNodeByName = function getNodeByName(name) {
    var node = this.getNodesByName(name);
    if (node === null) return null;
    return node[node.length - 1];
  };

  _proto.matchPath = function matchPath(path, options) {
    if (options === void 0) {
      options = {};
    }

    if (path === '' && !options.strictTrailingSlash) {
      path = '/';
    }

    var topLevelNodes = this.parser ? new Map([[this.name, this]]) : this.nameMap;
    var match = matchChildren(topLevelNodes, path, options);

    if (!match) {
      return null;
    }

    return buildStateFromMatch(match);
  };

  return RouteNode;
}();
/**
 * Create augmented RouteNode.
 * Ts workaround, to get proper augmented type autocomplete
 * @param init
 * @returns RouteNode
 */

var createNode = function createNode(init) {
  return new RouteNode(init);
};

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) {
  try {
    var info = gen[key](arg);
    var value = info.value;
  } catch (error) {
    reject(error);
    return;
  }

  if (info.done) {
    resolve(value);
  } else {
    Promise.resolve(value).then(_next, _throw);
  }
}

function _asyncToGenerator(fn) {
  return function () {
    var self = this,
        args = arguments;
    return new Promise(function (resolve, reject) {
      var gen = fn.apply(self, args);

      function _next(value) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value);
      }

      function _throw(err) {
        asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err);
      }

      _next(undefined);
    });
  };
}

/**
 * Copyright (c) 2014-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var Op = Object.prototype;
var hasOwn = Op.hasOwnProperty;
var undefined$1; // More compressible than void 0.

var $Symbol = typeof Symbol === "function" ? Symbol : {};
var iteratorSymbol = $Symbol.iterator || "@@iterator";
var asyncIteratorSymbol = $Symbol.asyncIterator || "@@asyncIterator";
var toStringTagSymbol = $Symbol.toStringTag || "@@toStringTag";

function wrap(innerFn, outerFn, self, tryLocsList) {
  // If outerFn provided and outerFn.prototype is a Generator, then outerFn.prototype instanceof Generator.
  var protoGenerator = outerFn && outerFn.prototype instanceof Generator ? outerFn : Generator;
  var generator = Object.create(protoGenerator.prototype);
  var context = new Context(tryLocsList || []); // The ._invoke method unifies the implementations of the .next,
  // .throw, and .return methods.

  generator._invoke = makeInvokeMethod(innerFn, self, context);
  return generator;
} // Try/catch helper to minimize deoptimizations. Returns a completion
// record like context.tryEntries[i].completion. This interface could
// have been (and was previously) designed to take a closure to be
// invoked without arguments, but in all the cases we care about we
// already have an existing method we want to call, so there's no need
// to create a new function object. We can even get away with assuming
// the method takes exactly one argument, since that happens to be true
// in every case, so we don't have to touch the arguments object. The
// only additional allocation required is the completion record, which
// has a stable shape and so hopefully should be cheap to allocate.


function tryCatch(fn, obj, arg) {
  try {
    return {
      type: "normal",
      arg: fn.call(obj, arg)
    };
  } catch (err) {
    return {
      type: "throw",
      arg: err
    };
  }
}

var GenStateSuspendedStart = "suspendedStart";
var GenStateSuspendedYield = "suspendedYield";
var GenStateExecuting = "executing";
var GenStateCompleted = "completed"; // Returning this object from the innerFn has the same effect as
// breaking out of the dispatch switch statement.

var ContinueSentinel = {}; // Dummy constructor functions that we use as the .constructor and
// .constructor.prototype properties for functions that return Generator
// objects. For full spec compliance, you may wish to configure your
// minifier not to mangle the names of these two functions.

function Generator() {}

function GeneratorFunction() {}

function GeneratorFunctionPrototype() {} // This is a polyfill for %IteratorPrototype% for environments that
// don't natively support it.


var IteratorPrototype = {};

IteratorPrototype[iteratorSymbol] = function () {
  return this;
};

var getProto = Object.getPrototypeOf;
var NativeIteratorPrototype = getProto && getProto(getProto(values([])));

if (NativeIteratorPrototype && NativeIteratorPrototype !== Op && hasOwn.call(NativeIteratorPrototype, iteratorSymbol)) {
  // This environment has a native %IteratorPrototype%; use it instead
  // of the polyfill.
  IteratorPrototype = NativeIteratorPrototype;
}

var Gp = GeneratorFunctionPrototype.prototype = Generator.prototype = Object.create(IteratorPrototype);
GeneratorFunction.prototype = Gp.constructor = GeneratorFunctionPrototype;
GeneratorFunctionPrototype.constructor = GeneratorFunction;
GeneratorFunctionPrototype[toStringTagSymbol] = GeneratorFunction.displayName = "GeneratorFunction"; // Helper for defining the .next, .throw, and .return methods of the
// Iterator interface in terms of a single ._invoke method.

function defineIteratorMethods(prototype) {
  ["next", "throw", "return"].forEach(function (method) {
    prototype[method] = function (arg) {
      return this._invoke(method, arg);
    };
  });
}

function isGeneratorFunction(genFun) {
  var ctor = typeof genFun === "function" && genFun.constructor;
  return ctor ? ctor === GeneratorFunction || // For the native GeneratorFunction constructor, the best we can
  // do is to check its .name property.
  (ctor.displayName || ctor.name) === "GeneratorFunction" : false;
}

function mark(genFun) {
  if (Object.setPrototypeOf) {
    Object.setPrototypeOf(genFun, GeneratorFunctionPrototype);
  } else {
    genFun.__proto__ = GeneratorFunctionPrototype;

    if (!(toStringTagSymbol in genFun)) {
      genFun[toStringTagSymbol] = "GeneratorFunction";
    }
  }

  genFun.prototype = Object.create(Gp);
  return genFun;
}
// `yield regeneratorRuntime.awrap(x)`, so that the runtime can test
// `hasOwn.call(value, "__await")` to determine if the yielded value is
// meant to be awaited.

function awrap(arg) {
  return {
    __await: arg
  };
}

function AsyncIterator(generator, PromiseImpl) {
  function invoke(method, arg, resolve, reject) {
    var record = tryCatch(generator[method], generator, arg);

    if (record.type === "throw") {
      reject(record.arg);
    } else {
      var result = record.arg;
      var value = result.value;

      if (value && typeof value === "object" && hasOwn.call(value, "__await")) {
        return PromiseImpl.resolve(value.__await).then(function (value) {
          invoke("next", value, resolve, reject);
        }, function (err) {
          invoke("throw", err, resolve, reject);
        });
      }

      return PromiseImpl.resolve(value).then(function (unwrapped) {
        // When a yielded Promise is resolved, its final value becomes
        // the .value of the Promise<{value,done}> result for the
        // current iteration.
        result.value = unwrapped;
        resolve(result);
      }, function (error) {
        // If a rejected Promise was yielded, throw the rejection back
        // into the async generator function so it can be handled there.
        return invoke("throw", error, resolve, reject);
      });
    }
  }

  var previousPromise;

  function enqueue(method, arg) {
    function callInvokeWithMethodAndArg() {
      return new PromiseImpl(function (resolve, reject) {
        invoke(method, arg, resolve, reject);
      });
    }

    return previousPromise = // If enqueue has been called before, then we want to wait until
    // all previous Promises have been resolved before calling invoke,
    // so that results are always delivered in the correct order. If
    // enqueue has not been called before, then it is important to
    // call invoke immediately, without waiting on a callback to fire,
    // so that the async generator function has the opportunity to do
    // any necessary setup in a predictable way. This predictability
    // is why the Promise constructor synchronously invokes its
    // executor callback, and why async functions synchronously
    // execute code before the first await. Since we implement simple
    // async functions in terms of async generators, it is especially
    // important to get this right, even though it requires care.
    previousPromise ? previousPromise.then(callInvokeWithMethodAndArg, // Avoid propagating failures to Promises returned by later
    // invocations of the iterator.
    callInvokeWithMethodAndArg) : callInvokeWithMethodAndArg();
  } // Define the unified helper method that is used to implement .next,
  // .throw, and .return (see defineIteratorMethods).


  this._invoke = enqueue;
}

defineIteratorMethods(AsyncIterator.prototype);

AsyncIterator.prototype[asyncIteratorSymbol] = function () {
  return this;
}; // Note that simple async functions are implemented on top of
// AsyncIterator objects; they just return a Promise for the value of
// the final result produced by the iterator.


function async(innerFn, outerFn, self, tryLocsList, PromiseImpl) {
  if (PromiseImpl === void 0) PromiseImpl = Promise;
  var iter = new AsyncIterator(wrap(innerFn, outerFn, self, tryLocsList), PromiseImpl);
  return isGeneratorFunction(outerFn) ? iter // If outerFn is a generator, return the full iterator.
  : iter.next().then(function (result) {
    return result.done ? result.value : iter.next();
  });
}

function makeInvokeMethod(innerFn, self, context) {
  var state = GenStateSuspendedStart;
  return function invoke(method, arg) {
    if (state === GenStateExecuting) {
      throw new Error("Generator is already running");
    }

    if (state === GenStateCompleted) {
      if (method === "throw") {
        throw arg;
      } // Be forgiving, per 25.3.3.3.3 of the spec:
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume


      return doneResult();
    }

    context.method = method;
    context.arg = arg;

    while (true) {
      var delegate = context.delegate;

      if (delegate) {
        var delegateResult = maybeInvokeDelegate(delegate, context);

        if (delegateResult) {
          if (delegateResult === ContinueSentinel) continue;
          return delegateResult;
        }
      }

      if (context.method === "next") {
        // Setting context._sent for legacy support of Babel's
        // function.sent implementation.
        context.sent = context._sent = context.arg;
      } else if (context.method === "throw") {
        if (state === GenStateSuspendedStart) {
          state = GenStateCompleted;
          throw context.arg;
        }

        context.dispatchException(context.arg);
      } else if (context.method === "return") {
        context.abrupt("return", context.arg);
      }

      state = GenStateExecuting;
      var record = tryCatch(innerFn, self, context);

      if (record.type === "normal") {
        // If an exception is thrown from innerFn, we leave state ===
        // GenStateExecuting and loop back for another invocation.
        state = context.done ? GenStateCompleted : GenStateSuspendedYield;

        if (record.arg === ContinueSentinel) {
          continue;
        }

        return {
          value: record.arg,
          done: context.done
        };
      } else if (record.type === "throw") {
        state = GenStateCompleted; // Dispatch the exception by looping back around to the
        // context.dispatchException(context.arg) call above.

        context.method = "throw";
        context.arg = record.arg;
      }
    }
  };
} // Call delegate.iterator[context.method](context.arg) and handle the
// result, either by returning a { value, done } result from the
// delegate iterator, or by modifying context.method and context.arg,
// setting context.delegate to null, and returning the ContinueSentinel.


function maybeInvokeDelegate(delegate, context) {
  var method = delegate.iterator[context.method];

  if (method === undefined$1) {
    // A .throw or .return when the delegate iterator has no .throw
    // method always terminates the yield* loop.
    context.delegate = null;

    if (context.method === "throw") {
      // Note: ["return"] must be used for ES3 parsing compatibility.
      if (delegate.iterator["return"]) {
        // If the delegate iterator has a return method, give it a
        // chance to clean up.
        context.method = "return";
        context.arg = undefined$1;
        maybeInvokeDelegate(delegate, context);

        if (context.method === "throw") {
          // If maybeInvokeDelegate(context) changed context.method from
          // "return" to "throw", let that override the TypeError below.
          return ContinueSentinel;
        }
      }

      context.method = "throw";
      context.arg = new TypeError("The iterator does not provide a 'throw' method");
    }

    return ContinueSentinel;
  }

  var record = tryCatch(method, delegate.iterator, context.arg);

  if (record.type === "throw") {
    context.method = "throw";
    context.arg = record.arg;
    context.delegate = null;
    return ContinueSentinel;
  }

  var info = record.arg;

  if (!info) {
    context.method = "throw";
    context.arg = new TypeError("iterator result is not an object");
    context.delegate = null;
    return ContinueSentinel;
  }

  if (info.done) {
    // Assign the result of the finished delegate to the temporary
    // variable specified by delegate.resultName (see delegateYield).
    context[delegate.resultName] = info.value; // Resume execution at the desired location (see delegateYield).

    context.next = delegate.nextLoc; // If context.method was "throw" but the delegate handled the
    // exception, let the outer generator proceed normally. If
    // context.method was "next", forget context.arg since it has been
    // "consumed" by the delegate iterator. If context.method was
    // "return", allow the original .return call to continue in the
    // outer generator.

    if (context.method !== "return") {
      context.method = "next";
      context.arg = undefined$1;
    }
  } else {
    // Re-yield the result returned by the delegate method.
    return info;
  } // The delegate iterator is finished, so forget it and continue with
  // the outer generator.


  context.delegate = null;
  return ContinueSentinel;
} // Define Generator.prototype.{next,throw,return} in terms of the
// unified ._invoke helper method.


defineIteratorMethods(Gp);
Gp[toStringTagSymbol] = "Generator"; // A Generator should always return itself as the iterator object when the
// @@iterator function is called on it. Some browsers' implementations of the
// iterator prototype chain incorrectly implement this, causing the Generator
// object to not be returned from this call. This ensures that doesn't happen.
// See https://github.com/facebook/regenerator/issues/274 for more details.

Gp[iteratorSymbol] = function () {
  return this;
};

Gp.toString = function () {
  return "[object Generator]";
};

function pushTryEntry(locs) {
  var entry = {
    tryLoc: locs[0]
  };

  if (1 in locs) {
    entry.catchLoc = locs[1];
  }

  if (2 in locs) {
    entry.finallyLoc = locs[2];
    entry.afterLoc = locs[3];
  }

  this.tryEntries.push(entry);
}

function resetTryEntry(entry) {
  var record = entry.completion || {};
  record.type = "normal";
  delete record.arg;
  entry.completion = record;
}

function Context(tryLocsList) {
  // The root entry object (effectively a try statement without a catch
  // or a finally block) gives us a place to store values thrown from
  // locations where there is no enclosing try statement.
  this.tryEntries = [{
    tryLoc: "root"
  }];
  tryLocsList.forEach(pushTryEntry, this);
  this.reset(true);
}

function keys(object) {
  var keys = [];

  for (var key in object) {
    keys.push(key);
  }

  keys.reverse(); // Rather than returning an object with a next method, we keep
  // things simple and return the next function itself.

  return function next() {
    while (keys.length) {
      var key = keys.pop();

      if (key in object) {
        next.value = key;
        next.done = false;
        return next;
      }
    } // To avoid creating an additional object, we just hang the .value
    // and .done properties off the next function object itself. This
    // also ensures that the minifier will not anonymize the function.


    next.done = true;
    return next;
  };
}

function values(iterable) {
  if (iterable) {
    var iteratorMethod = iterable[iteratorSymbol];

    if (iteratorMethod) {
      return iteratorMethod.call(iterable);
    }

    if (typeof iterable.next === "function") {
      return iterable;
    }

    if (!isNaN(iterable.length)) {
      var i = -1,
          next = function next() {
        while (++i < iterable.length) {
          if (hasOwn.call(iterable, i)) {
            next.value = iterable[i];
            next.done = false;
            return next;
          }
        }

        next.value = undefined$1;
        next.done = true;
        return next;
      };

      return next.next = next;
    }
  } // Return an iterator with no values.


  return {
    next: doneResult
  };
}

function doneResult() {
  return {
    value: undefined$1,
    done: true
  };
}

Context.prototype = {
  constructor: Context,
  reset: function reset(skipTempReset) {
    this.prev = 0;
    this.next = 0; // Resetting context._sent for legacy support of Babel's
    // function.sent implementation.

    this.sent = this._sent = undefined$1;
    this.done = false;
    this.delegate = null;
    this.method = "next";
    this.arg = undefined$1;
    this.tryEntries.forEach(resetTryEntry);

    if (!skipTempReset) {
      for (var name in this) {
        // Not sure about the optimal order of these conditions:
        if (name.charAt(0) === "t" && hasOwn.call(this, name) && !isNaN(+name.slice(1))) {
          this[name] = undefined$1;
        }
      }
    }
  },
  stop: function stop() {
    this.done = true;
    var rootEntry = this.tryEntries[0];
    var rootRecord = rootEntry.completion;

    if (rootRecord.type === "throw") {
      throw rootRecord.arg;
    }

    return this.rval;
  },
  dispatchException: function dispatchException(exception) {
    if (this.done) {
      throw exception;
    }

    var context = this;

    function handle(loc, caught) {
      record.type = "throw";
      record.arg = exception;
      context.next = loc;

      if (caught) {
        // If the dispatched exception was caught by a catch block,
        // then let that catch block handle the exception normally.
        context.method = "next";
        context.arg = undefined$1;
      }

      return !!caught;
    }

    for (var i = this.tryEntries.length - 1; i >= 0; --i) {
      var entry = this.tryEntries[i];
      var record = entry.completion;

      if (entry.tryLoc === "root") {
        // Exception thrown outside of any try block that could handle
        // it, so set the completion value of the entire function to
        // throw the exception.
        return handle("end");
      }

      if (entry.tryLoc <= this.prev) {
        var hasCatch = hasOwn.call(entry, "catchLoc");
        var hasFinally = hasOwn.call(entry, "finallyLoc");

        if (hasCatch && hasFinally) {
          if (this.prev < entry.catchLoc) {
            return handle(entry.catchLoc, true);
          } else if (this.prev < entry.finallyLoc) {
            return handle(entry.finallyLoc);
          }
        } else if (hasCatch) {
          if (this.prev < entry.catchLoc) {
            return handle(entry.catchLoc, true);
          }
        } else if (hasFinally) {
          if (this.prev < entry.finallyLoc) {
            return handle(entry.finallyLoc);
          }
        } else {
          throw new Error("try statement without catch or finally");
        }
      }
    }
  },
  abrupt: function abrupt(type, arg) {
    for (var i = this.tryEntries.length - 1; i >= 0; --i) {
      var entry = this.tryEntries[i];

      if (entry.tryLoc <= this.prev && hasOwn.call(entry, "finallyLoc") && this.prev < entry.finallyLoc) {
        var finallyEntry = entry;
        break;
      }
    }

    if (finallyEntry && (type === "break" || type === "continue") && finallyEntry.tryLoc <= arg && arg <= finallyEntry.finallyLoc) {
      // Ignore the finally entry if control is not jumping to a
      // location outside the try/catch block.
      finallyEntry = null;
    }

    var record = finallyEntry ? finallyEntry.completion : {};
    record.type = type;
    record.arg = arg;

    if (finallyEntry) {
      this.method = "next";
      this.next = finallyEntry.finallyLoc;
      return ContinueSentinel;
    }

    return this.complete(record);
  },
  complete: function complete(record, afterLoc) {
    if (record.type === "throw") {
      throw record.arg;
    }

    if (record.type === "break" || record.type === "continue") {
      this.next = record.arg;
    } else if (record.type === "return") {
      this.rval = this.arg = record.arg;
      this.method = "return";
      this.next = "end";
    } else if (record.type === "normal" && afterLoc) {
      this.next = afterLoc;
    }

    return ContinueSentinel;
  },
  finish: function finish(finallyLoc) {
    for (var i = this.tryEntries.length - 1; i >= 0; --i) {
      var entry = this.tryEntries[i];

      if (entry.finallyLoc === finallyLoc) {
        this.complete(entry.completion, entry.afterLoc);
        resetTryEntry(entry);
        return ContinueSentinel;
      }
    }
  },
  "catch": function _catch(tryLoc) {
    for (var i = this.tryEntries.length - 1; i >= 0; --i) {
      var entry = this.tryEntries[i];

      if (entry.tryLoc === tryLoc) {
        var record = entry.completion;

        if (record.type === "throw") {
          var thrown = record.arg;
          resetTryEntry(entry);
        }

        return thrown;
      }
    } // The context.catch method must only be called with a location
    // argument that corresponds to a known catch block.


    throw new Error("illegal catch attempt");
  },
  delegateYield: function delegateYield(iterable, resultName, nextLoc) {
    this.delegate = {
      iterator: values(iterable),
      resultName: resultName,
      nextLoc: nextLoc
    };

    if (this.method === "next") {
      // Deliberately forget the last sent value so that we don't
      // accidentally pass it on to the delegate.
      this.arg = undefined$1;
    }

    return ContinueSentinel;
  }
}; // Export a default namespace that plays well with Rollup

var _regeneratorRuntime = {
  wrap: wrap,
  isGeneratorFunction: isGeneratorFunction,
  AsyncIterator: AsyncIterator,
  mark: mark,
  awrap: awrap,
  async: async,
  keys: keys,
  values: values
};

var errorCodes = {
  ROUTER_NOT_STARTED: 'NOT_STARTED',
  ROUTER_INCORRECT_CONFIGS: 'INCORRECT_CONFIGS',
  ROUTER_ALREADY_STARTED: 'ALREADY_STARTED',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  SAME_STATES: 'SAME_STATES',
  TRANSITION_UNKNOWN_ERROR: 'TRANSITION_UNKNOWN_ERROR',
  TRANSITION_CANCELLED: 'TRANSITION_CANCELLED',
  TRANSITION_REDIRECTED: 'TRANSITION_REDIRECTED'
};
var events = {
  ROUTER_START: '@@event/start',
  ROUTER_STOP: '@@event/stop',
  TRANSITION_START: '@@event/transition/start',
  TRANSITION_SUCCESS: '@@event/transition/success',
  TRANSITION_CANCELED: '@@event/transition/canceled',
  TRANSITION_REDIRECTED: '@@event/transition/redirected',
  TRANSITION_UNKNOWN_ERROR: '@@event/transition/unknown_error',
  ROUTER_RELOAD_NODE: '@@event/node/reload'
};

function _setPrototypeOf(o, p) {
  _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) {
    o.__proto__ = p;
    return o;
  };

  return _setPrototypeOf(o, p);
}

function _inheritsLoose(subClass, superClass) {
  subClass.prototype = Object.create(superClass.prototype);
  subClass.prototype.constructor = subClass;
  _setPrototypeOf(subClass, superClass);
}

function _getPrototypeOf(o) {
  _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) {
    return o.__proto__ || Object.getPrototypeOf(o);
  };
  return _getPrototypeOf(o);
}

function _isNativeFunction(fn) {
  return Function.toString.call(fn).indexOf("[native code]") !== -1;
}

function _isNativeReflectConstruct() {
  if (typeof Reflect === "undefined" || !Reflect.construct) return false;
  if (Reflect.construct.sham) return false;
  if (typeof Proxy === "function") return true;

  try {
    Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {}));
    return true;
  } catch (e) {
    return false;
  }
}

function _construct(Parent, args, Class) {
  if (_isNativeReflectConstruct()) {
    _construct = Reflect.construct;
  } else {
    _construct = function _construct(Parent, args, Class) {
      var a = [null];
      a.push.apply(a, args);
      var Constructor = Function.bind.apply(Parent, a);
      var instance = new Constructor();
      if (Class) _setPrototypeOf(instance, Class.prototype);
      return instance;
    };
  }

  return _construct.apply(null, arguments);
}

function _wrapNativeSuper(Class) {
  var _cache = typeof Map === "function" ? new Map() : undefined;

  _wrapNativeSuper = function _wrapNativeSuper(Class) {
    if (Class === null || !_isNativeFunction(Class)) return Class;

    if (typeof Class !== "function") {
      throw new TypeError("Super expression must either be null or a function");
    }

    if (typeof _cache !== "undefined") {
      if (_cache.has(Class)) return _cache.get(Class);

      _cache.set(Class, Wrapper);
    }

    function Wrapper() {
      return _construct(Class, arguments, _getPrototypeOf(this).constructor);
    }

    Wrapper.prototype = Object.create(Class.prototype, {
      constructor: {
        value: Wrapper,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    return _setPrototypeOf(Wrapper, Class);
  };

  return _wrapNativeSuper(Class);
}

var _excluded$4 = ["code", "triggerEvent", "message", "redirect"],
    _excluded2 = ["to", "params"];
var RouterError = /*#__PURE__*/function (_Error) {
  _inheritsLoose(RouterError, _Error);

  function RouterError(code, message) {
    var _this;

    _this = _Error.call(this, message) || this;
    _this.code = void 0;
    _this.args = void 0;
    _this.name = 'RouterError';
    _this.code = code;

    for (var _len = arguments.length, args = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }

    if (args) {
      _this.args = args;
    }

    return _this;
  }

  return RouterError;
}( /*#__PURE__*/_wrapNativeSuper(Error));
var NavigationError = /*#__PURE__*/function (_Error2) {
  _inheritsLoose(NavigationError, _Error2);

  function NavigationError(_ref) {
    var _this2;

    var code = _ref.code,
        triggerEvent = _ref.triggerEvent,
        message = _ref.message,
        redirect = _ref.redirect,
        args = _objectWithoutPropertiesLoose(_ref, _excluded$4);

    _this2 = _Error2.call(this, message) || this;
    _this2.code = void 0;
    _this2.triggerEvent = void 0;
    _this2.redirect = void 0;
    _this2.args = void 0;
    _this2.name = 'NavigationError';
    _this2.code = code;
    _this2.triggerEvent = triggerEvent;

    if (redirect) {
      _this2.redirect = redirect;
    }

    if (args) {
      _this2.args = args;
    }

    return _this2;
  }

  return NavigationError;
}( /*#__PURE__*/_wrapNativeSuper(Error));
var Redirect = /*#__PURE__*/function (_NavigationError) {
  _inheritsLoose(Redirect, _NavigationError);

  function Redirect(_ref2) {
    var to = _ref2.to,
        params = _ref2.params,
        args = _objectWithoutPropertiesLoose(_ref2, _excluded2);

    return _NavigationError.call(this, _extends({
      code: errorCodes.TRANSITION_REDIRECTED,
      triggerEvent: events.TRANSITION_REDIRECTED,
      redirect: {
        to: to,
        params: params
      }
    }, args)) || this;
  }

  return Redirect;
}(NavigationError);

var Node = /*#__PURE__*/function (_RouteNode) {
  _inheritsLoose(Node, _RouteNode);

  function Node(params) {
    var _this;

    _this = _RouteNode.call(this, params) || this;
    _this.asyncRequests = void 0;
    _this.onEnter = void 0;
    _this.defaultParams = {};
    _this.ignoreReloadCall = false;
    _this.components = {};

    if (params.defaultParams) {
      _this.defaultParams = params.defaultParams;
    }

    if (params.asyncRequests) {
      _this.asyncRequests = params.asyncRequests;
    }

    if (params.onEnter) {
      _this.onEnter = params.onEnter;
    }

    if (params.encodeParams) {
      _this.encodeParams = params.encodeParams;
    }

    if (params.decodeParams) {
      _this.decodeParams = params.decodeParams;
    }

    if (params.ignoreReloadCall) {
      _this.ignoreReloadCall = params.ignoreReloadCall;
    }

    if (params.components) {
      _this.components = params.components;
    }

    return _this;
  }

  return Node;
}(RouteNode);

function _createForOfIteratorHelperLoose$2(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$2(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray$2(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$2(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$2(o, minLen); }

function _arrayLikeToArray$2(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
var Router42 = /*#__PURE__*/function () {
  function Router42(routes, options, dependencies) {
    this.options = {
      autoCleanUp: true,
      allowNotFound: false,
      strongMatching: true,
      rewritePathOnMatch: true,
      pathOptions: {
        trailingSlashMode: 'default',
        queryParamsMode: 'default',
        queryParamFormats: {
          arrayFormat: 'none',
          booleanFormat: 'none',
          nullFormat: 'default'
        },
        urlParamsEncoding: 'default',
        caseSensitive: false,
        strictTrailingSlash: false
      }
    };
    this.hooks = {
      preNavigate: undefined
    };
    this.dependencies = void 0;
    this.callbacks = {};
    this.state = null;
    this.stateId = 0;
    this.started = false;
    this.rootNode = void 0;
    this.transitionId = -1;
    this.illegalChars = new RegExp(/[.*+?^${}()|[\]\\]/, 'g');
    this.options = _extends({}, this.options, options);

    if (!(routes instanceof Array)) {
      if ((routes.name || '').length > 0 || (routes.path || '').length > 0) {
        throw new RouterError(errorCodes.ROUTER_INCORRECT_CONFIGS, 'First node in a tree should have empty name and path, e.g. `new Route({children: [...]})` or `{children: [...]}`');
      }
    }

    this.dependencies = dependencies;

    if (routes instanceof Node) {
      this.rootNode = routes;
    } else if (routes instanceof Array) {
      this.rootNode = new Node({
        children: routes
      });
    } else {
      this.rootNode = new Node(routes);
    }
  } // static fromNode<Dependencies>(routes: NodeSignature<Dependencies> | NodeSignature<Dependencies>[], options?: Partial<Options>, dependencies?: Dependencies) {
  //     return new this(routes);
  // }
  // static fromSignature<Dependencies>(
  //     routes: NodeInitParams<Dependencies, Node<Dependencies>> | NodeInitParams<Dependencies, Node<Dependencies>>[],
  //     options?: Partial<Options>,
  //     dependencies?: Dependencies
  // ) {
  //     return new this(routes, options, dependencies);
  // }
  //
  // Events
  //


  var _proto = Router42.prototype;

  _proto.invokeEventListeners = function invokeEventListeners(eventName, params) {
    (this.callbacks[eventName] || []).forEach(function (cb) {
      return cb(params);
    });
  };

  _proto.removeEventListener = function removeEventListener(eventName, cb) {
    this.callbacks[eventName] = this.callbacks[eventName].filter(function (_cb) {
      return _cb !== cb;
    });
  };

  _proto.addEventListener = function addEventListener(eventName, cb) {
    var _this = this;

    this.callbacks[eventName] = (this.callbacks[eventName] || []).concat(cb);
    return function () {
      return _this.removeEventListener(eventName, cb);
    };
  } //
  // Routes
  //
  ;

  _proto.buildPath = function buildPath(name, params) {
    var _this$state, _this$rootNode$getNod;

    name = this.inheritNameFragments((_this$state = this.state) == null ? void 0 : _this$state.name, name);
    var defaultParams = ((_this$rootNode$getNod = this.rootNode.getNodeByName(name)) == null ? void 0 : _this$rootNode$getNod.defaultParams) || {};
    var _this$options$pathOpt = this.options.pathOptions,
        trailingSlashMode = _this$options$pathOpt.trailingSlashMode,
        queryParamsMode = _this$options$pathOpt.queryParamsMode,
        queryParamFormats = _this$options$pathOpt.queryParamFormats,
        urlParamsEncoding = _this$options$pathOpt.urlParamsEncoding;
    return this.rootNode.buildPath(name, _extends({}, defaultParams, params), {
      trailingSlashMode: trailingSlashMode,
      queryParamsMode: queryParamsMode,
      queryParamFormats: queryParamFormats,
      urlParamsEncoding: urlParamsEncoding
    });
  }
  /**
   * Do this have any potential use?
   * @param path
   * @returns
   */
  ;

  _proto.matchPath = function matchPath(path) {
    var match = this.rootNode.matchPath(path, this.options.pathOptions);

    if (match == null) {
      return null;
    }

    var name = match.name,
        params = match.params,
        meta = match.meta;
    return this.makeState(name, params, {
      params: meta.params,
      navigation: {},
      redirected: false
    });
  };

  _proto.isActive = function isActive(name, params, exact, ignoreQueryParams) {
    if (exact === void 0) {
      exact = true;
    }

    if (ignoreQueryParams === void 0) {
      ignoreQueryParams = true;
    }

    if (this.state === null) return false;
    name = this.inheritNameFragments(this.state.name, name);

    if (exact) {
      return this.areStatesEqual(this.makeState(name, params), this.state, ignoreQueryParams);
    }

    return this.isEqualOrDescendant(this.makeState(name, params), this.state);
  };

  _proto.isEqualOrDescendant = function isEqualOrDescendant(parentState, childState) {
    var regex = new RegExp('^' + parentState.name + '($|\\..*$)');
    if (!regex.test(childState.name)) return false; // If child state name extends parent state name, and all parent state params
    // are in child state params.

    return Object.keys(parentState.params).every(function (p) {
      return parentState.params[p] === childState.params[p];
    });
  } //
  // State management
  //
  ;

  _proto.makeState = function makeState(name, params, meta, forceId) {
    var _this$rootNode$getNod2;

    if (params === void 0) {
      params = {};
    }

    var defaultParams = ((_this$rootNode$getNod2 = this.rootNode.getNodeByName(name)) == null ? void 0 : _this$rootNode$getNod2.defaultParams) || {};
    return {
      name: name,
      params: _extends({}, defaultParams, params),
      meta: meta ? _extends({}, meta, {
        id: forceId === undefined ? ++this.stateId : forceId
      }) : undefined,
      path: this.buildPath(name, params),
      activeNodes: []
    };
  };

  _proto.areStatesEqual = function areStatesEqual(state1, state2, ignoreQueryParams) {
    var _this2 = this;

    if (ignoreQueryParams === void 0) {
      ignoreQueryParams = true;
    }

    if (state1.name !== state2.name) return false;

    var getUrlParams = function getUrlParams(name) {
      var _this2$rootNode$getNo, _this2$rootNode$getNo2;

      return ((_this2$rootNode$getNo = _this2.rootNode.getNodeByName(name)) == null ? void 0 : (_this2$rootNode$getNo2 = _this2$rootNode$getNo.parser) == null ? void 0 : _this2$rootNode$getNo2['urlParams']) || [];
    };

    var state1Params = ignoreQueryParams ? getUrlParams(state1.name) : Object.keys(state1.params);
    var state2Params = ignoreQueryParams ? getUrlParams(state2.name) : Object.keys(state2.params);
    return state1Params.length === state2Params.length && state1Params.every(function (p) {
      return state1.params[p] === state2.params[p];
    });
  };

  _proto.buildNodeState = function buildNodeState(name, params) {
    var _this$rootNode$getNod3;

    if (params === void 0) {
      params = {};
    }

    var _params = _extends({}, ((_this$rootNode$getNod3 = this.rootNode.getNodeByName(name)) == null ? void 0 : _this$rootNode$getNod3.defaultParams) || {}, params);

    return this.rootNode.buildState(name, _params);
  } //
  // Lifecycle
  //
  ;

  _proto.start = function start(path) {
    if (this.started) {
      throw new RouterError(errorCodes.ROUTER_ALREADY_STARTED, 'already started');
    }

    this.started = true;
    this.invokeEventListeners(events.ROUTER_START);
    return this.navigateByPath(path);
  };

  _proto.stop = function stop() {
    if (!this.started) {
      throw new RouterError(errorCodes.ROUTER_NOT_STARTED, 'not started');
    }

    this.started = false;
    this.invokeEventListeners(events.ROUTER_STOP);
  } //
  // Navigation
  //
  ;

  _proto.cancel = function cancel() {
    this.transitionId += 1;
  }
  /**
   * Do not like name-based navigation?
   * Use this, url-based navigation.
   * But it's less performant, cause it will do additional trip through nodes.
   * @param path Just url, real plain url, without tokens (aka `:page`, `*spat` or whatever)
   * @param params Params to override, or additional params to add
   * @param options Navigation options
   * @returns
   */
  ;

  _proto.navigateByPath = function navigateByPath(path, params, options) {
    if (params === void 0) {
      params = {};
    }

    if (options === void 0) {
      options = {};
    }

    var node = this.rootNode.matchPath(path, this.options.pathOptions);
    return this.navigate((node == null ? void 0 : node.name) || path, _extends({}, (node == null ? void 0 : node.params) || {}, params), options);
  };

  _proto.inheritNameFragments = function inheritNameFragments(basedOn, target) {
    if (!basedOn || !target) return target;
    if (target.indexOf('*') === -1) return target;
    var base = basedOn.split('.');
    var result = target.split('.').reduce(function (result, part, index) {
      if (part === '*') {
        result.push(base[index] || '*');
      } else {
        result.push(part);
      }

      return result;
    }, []);
    return result.join('.');
  };

  _proto.navigate = function navigate(name, params, options) {
    var _this$state2;

    if (options === void 0) {
      options = {};
    }

    if (!this.started) {
      // throw instead ?
      return Promise.resolve({
        type: 'error',
        payload: {
          error: new NavigationError({
            code: errorCodes.ROUTER_NOT_STARTED
          })
        }
      });
    }

    name = this.inheritNameFragments((_this$state2 = this.state) == null ? void 0 : _this$state2.name, name);

    if (this.hooks.preNavigate) {
      var _this$hooks$preNaviga = this.hooks.preNavigate(name, params);

      name = _this$hooks$preNaviga[0];
      params = _this$hooks$preNaviga[1];
    }

    var nodeState = null;

    if (name) {
      nodeState = this.buildNodeState(name, params);
    }

    if (!nodeState) {
      // 404 was defined but wasn't found, and this is this.navigate(404) call already
      if (name === this.options.notFoundRouteName && !nodeState) {
        throw new NavigationError({
          code: errorCodes.TRANSITION_CANCELLED,
          message: "404 page was set in options, but wasn't defined in routes"
        });
      } // Navigate to 404, if set


      if (this.options.allowNotFound && this.options.notFoundRouteName) {
        return this.navigate(this.options.notFoundRouteName, {
          path: name
        }, {
          replace: true,
          reload: true
        });
      }

      if (name === this.options.defaultRouteName && !nodeState) {
        throw new NavigationError({
          code: errorCodes.TRANSITION_CANCELLED,
          message: "defaultPage page was set in options, but wasn't defined in routes"
        });
      } // Navigate to default route, if set, and if 404 is not set or disabled


      if (this.options.defaultRouteName) {
        return this.navigate(this.options.defaultRouteName, {
          replace: true,
          reload: true
        });
      } // add listner invocation?


      return Promise.resolve({
        type: 'error',
        payload: {
          error: new NavigationError({
            code: errorCodes.ROUTE_NOT_FOUND
          })
        }
      });
    }

    var toState = this.makeState(nodeState.name, nodeState.params, {
      params: nodeState.meta.params,
      navigation: options,
      redirected: false
    });
    var sameStates = this.state ? this.areStatesEqual(this.state, toState, false) : false;

    if (sameStates && !options.force && !options.reload) {
      // add listner invocation?
      return Promise.resolve({
        type: 'error',
        payload: {
          error: new NavigationError({
            code: errorCodes.SAME_STATES
          })
        }
      });
    }

    this.transitionId += 1;
    return this.transition(this.transitionId, toState, this.state, options);
  };

  _proto.transition = /*#__PURE__*/function () {
    var _transition = _asyncToGenerator( /*#__PURE__*/_regeneratorRuntime.mark(function _callee(id, toState, fromState, options) {
      var _this3 = this;

      var canceled, afterAsync, afterOnEnter, _this$transitionPath, toDeactivate, toActivate, intersection, chain, _loop, _iterator, _step, _yield$chain, state;

      return _regeneratorRuntime.wrap(function _callee$(_context) {
        while (1) {
          switch (_context.prev = _context.next) {
            case 0:
              canceled = function canceled() {
                return id !== _this3.transitionId;
              };

              afterAsync = function afterAsync(result) {
                if (canceled()) {
                  throw new NavigationError({
                    code: errorCodes.TRANSITION_CANCELLED,
                    triggerEvent: events.TRANSITION_CANCELED
                  });
                } // Useless part, state is always present (?)


                if (!result[0].state) {
                  result[0].state = toState;
                }

                return {
                  state: result[0].state,
                  passthrough: result[0].passthrough,
                  asyncResult: result[1]
                };
              };

              afterOnEnter = function afterOnEnter(_temp) {
                var _ref = _temp === void 0 ? {} : _temp,
                    state = _ref.state,
                    passthrough = _ref.passthrough;

                if (canceled()) {
                  throw new NavigationError({
                    code: errorCodes.TRANSITION_CANCELLED,
                    triggerEvent: events.TRANSITION_CANCELED
                  });
                }

                if (!state) {
                  state = toState;
                }

                return {
                  state: state,
                  passthrough: passthrough
                };
              };

              _this$transitionPath = this.transitionPath(fromState, toState), toDeactivate = _this$transitionPath.toDeactivate, toActivate = _this$transitionPath.toActivate, intersection = _this$transitionPath.intersection;
              chain = Promise.resolve({
                state: toState,
                passthrough: undefined
              });

              _loop = function _loop() {
                var node = _step.value;
                var asyncFn = null;

                if (node.asyncRequests) {
                  asyncFn = node.asyncRequests({
                    node: node,
                    toState: toState,
                    fromState: fromState,
                    dependencies: _this3.dependencies
                  }) || null;
                }

                if (node.onEnter) {
                  var ent = node.onEnter;
                  chain = Promise.all([chain, asyncFn]).then(afterAsync) // Check is transition was canceled after Async and chain calls, especially matters for the first `chain` which do not have any execution delay
                  .then(function (result) {
                    return ent({
                      node: node,
                      toState: result.state,
                      fromState: fromState,
                      dependencies: _this3.dependencies,
                      asyncResult: result.asyncResult,
                      passthrough: result.passthrough
                    });
                  }).then(afterOnEnter); // Check is transition was canceled after onEnter, usefull if onEnter returns Promise that will take some time to execute.
                }
              };

              for (_iterator = _createForOfIteratorHelperLoose$2(toActivate); !(_step = _iterator()).done;) {
                _loop();
              }

              _context.prev = 7;
              _context.next = 10;
              return chain;

            case 10:
              _yield$chain = _context.sent;
              state = _yield$chain.state;
              state.activeNodes = intersection.concat(toActivate);
              this.state = toState = state;
              this.invokeEventListeners(events.TRANSITION_SUCCESS, {
                fromState: fromState,
                toState: toState,
                nodes: {
                  toDeactivate: toDeactivate,
                  toActivate: toActivate,
                  intersection: intersection
                },
                options: options
              });
              return _context.abrupt("return", {
                type: 'success',
                payload: {
                  fromState: fromState,
                  toState: toState,
                  toDeactivate: toDeactivate,
                  toActivate: toActivate
                }
              });

            case 18:
              _context.prev = 18;
              _context.t0 = _context["catch"](7);

              if (_context.t0.name !== 'NavigationError') {
                _context.t0.code = errorCodes.TRANSITION_UNKNOWN_ERROR;
                _context.t0.triggerEvent = events.TRANSITION_UNKNOWN_ERROR;
              }

              if (!(_context.t0.code === errorCodes.TRANSITION_REDIRECTED)) {
                _context.next = 23;
                break;
              }

              return _context.abrupt("return", this.navigate(_context.t0.redirect.to, _context.t0.redirect.params, {
                force: true
              }));

            case 23:
              if (_context.t0.triggerEvent) {
                this.invokeEventListeners(_context.t0.triggerEvent, {
                  fromState: fromState,
                  toState: toState,
                  nodes: {
                    toDeactivate: toDeactivate,
                    toActivate: toActivate,
                    intersection: intersection
                  },
                  options: options,
                  error: _context.t0
                });
              }

              return _context.abrupt("return", {
                type: 'error',
                payload: {
                  fromState: fromState,
                  toState: toState,
                  toDeactivate: toDeactivate,
                  toActivate: toActivate,
                  error: _context.t0
                }
              });

            case 25:
            case "end":
              return _context.stop();
          }
        }
      }, _callee, this, [[7, 18]]);
    }));

    function transition(_x, _x2, _x3, _x4) {
      return _transition.apply(this, arguments);
    }

    return transition;
  }();

  _proto.transitionPath = function transitionPath(fromState, toState) {
    var _toState$meta2;

    function paramsAreEqual(name) {
      var _fromState$meta, _toState$meta;

      var fromParams = Object.keys((fromState == null ? void 0 : (_fromState$meta = fromState.meta) == null ? void 0 : _fromState$meta.params[name]) || {}).reduce(function (params, p) {
        params[p] = fromState == null ? void 0 : fromState.params[p];
        return params;
      }, {});
      var toParams = Object.keys(((_toState$meta = toState.meta) == null ? void 0 : _toState$meta.params[name]) || {}).reduce(function (params, p) {
        params[p] = toState.params[p];
        return params;
      }, {}); // is this a possible scenario at all?
      // ToDo: check and remove this block if not

      if (Object.keys(toParams).length !== Object.keys(fromParams).length) {
        return false;
      }

      if (Object.keys(toParams).length === 0) {
        return true;
      }

      return Object.keys(toParams).some(function (p) {
        return toParams[p] === fromParams[p];
      });
    }

    var toNavigationOpts = (toState == null ? void 0 : (_toState$meta2 = toState.meta) == null ? void 0 : _toState$meta2.navigation) || {};
    var fromStateIds = [];
    var toStateIds = [];
    var toActivate = [];
    var toDeactivate = [];
    var intersection = [];

    if (fromState !== null) {
      fromStateIds = fromState.name.split('.');
      toDeactivate = this.rootNode.getNodesByName(fromState.name) || [];
    }

    toStateIds = toState.name.split('.');
    toActivate = this.rootNode.getNodesByName(toState.name) || [];

    var _ref2 = fromState != null && fromState.name.length || 0 > toState.name.length ? [toStateIds, fromStateIds] : [fromStateIds, toStateIds],
        compBase = _ref2[0],
        compTo = _ref2[1];

    var index = 0;
    var node = 0;
    var segmentName = null;

    for (var _iterator2 = _createForOfIteratorHelperLoose$2(compBase), _step2; !(_step2 = _iterator2()).done;) {
      var value = _step2.value;
      segmentName = segmentName === null ? value : segmentName + "." + value;

      if (compTo.indexOf(value) === index && paramsAreEqual(segmentName) && (!toNavigationOpts.reload || toActivate[node].ignoreReloadCall)) {
        var commonNode = toActivate.splice(node, 1)[0];
        toDeactivate.splice(node, 1);
        intersection.push(commonNode);
        index += 1;
      } else {
        index += 1;
        node += 1; // break;
      }
    }

    return {
      toDeactivate: toDeactivate,
      toActivate: toActivate,
      intersection: intersection
    };
  };

  return Router42;
}();

var BrowserHistory = /*#__PURE__*/function () {
  function BrowserHistory(router) {
    this.router = void 0;
    this.removePopStateListener = void 0;
    this.router = router;
    this.removePopStateListener = null;
  }

  var _proto = BrowserHistory.prototype;

  _proto.getLocation = function getLocation() {
    var correctedPath = safelyEncodePath(window.location.pathname);
    return (correctedPath || '/') + window.location.search;
  };

  _proto.getHash = function getHash() {
    return window.location.hash;
  };

  _proto.replaceState = function replaceState(state, title, path) {
    window.history.replaceState(state, title, path);
  };

  _proto.pushState = function pushState(state, title, path) {
    window.history.pushState(state, title, path);
  };

  _proto.getState = function getState() {
    return window.history.state;
  };

  _proto.onPopState = function onPopState(evt) {
    var _evt$state;

    var newState = !((_evt$state = evt.state) != null && _evt$state.name);
    var state = newState ? this.router.matchPath(this.getLocation()) : this.router.makeState(evt.state.name, evt.state.params, _extends({}, evt.state.meta), evt.state.meta.id);
    if (!state) return;
    if (this.router.state && this.router.areStatesEqual(state, this.router.state, false)) return;
    this.router.navigate(state.name, state.params);
  };

  _proto.updateState = function updateState(toState, url, replace) {
    // const trimmedState = toState
    //     ? {
    //           meta: toState.meta,
    //           name: toState.name,
    //           params: toState.params,
    //           path: toState.path,
    //       }
    //     : toState;
    if (replace) this.replaceState(toState, '', url);else this.pushState(toState, '', url);
  };

  _proto.start = function start() {
    var b = this.onPopState.bind(this);
    window.addEventListener('popstate', b);

    this.removePopStateListener = function () {
      window.removeEventListener('popstate', b);
    };
  };

  _proto.stop = function stop() {
    if (this.removePopStateListener !== null) {
      this.removePopStateListener();
      this.removePopStateListener = null;
    }
  };

  _proto.onTransitionSuccess = function onTransitionSuccess(_ref) {
    var fromState = _ref.fromState,
        toState = _ref.toState,
        options = _ref.options;
    var historyState = this.getState();
    var hasState = historyState !== null;
    var statesAreEqual = fromState !== null && this.router.areStatesEqual(fromState, toState, false);
    var replace = options.replace || !hasState || statesAreEqual;
    var url = this.router.buildPath(toState.name, toState.params); // why only on null state ?

    if (fromState === null) {
      url += this.getHash();
    }

    this.updateState(toState, url, replace);
  };

  return BrowserHistory;
}();

var safelyEncodePath = function safelyEncodePath(path) {
  try {
    return encodeURI(decodeURI(path));
  } catch (_) {
    return path;
  }
};

var react = {exports: {}};

var react_production_min = {};

/*
object-assign
(c) Sindre Sorhus
@license MIT
*/
/* eslint-disable no-unused-vars */

var getOwnPropertySymbols = Object.getOwnPropertySymbols;
var hasOwnProperty = Object.prototype.hasOwnProperty;
var propIsEnumerable = Object.prototype.propertyIsEnumerable;

function toObject(val) {
  if (val === null || val === undefined) {
    throw new TypeError('Object.assign cannot be called with null or undefined');
  }

  return Object(val);
}

function shouldUseNative() {
  try {
    if (!Object.assign) {
      return false;
    } // Detect buggy property enumeration order in older V8 versions.
    // https://bugs.chromium.org/p/v8/issues/detail?id=4118


    var test1 = new String('abc'); // eslint-disable-line no-new-wrappers

    test1[5] = 'de';

    if (Object.getOwnPropertyNames(test1)[0] === '5') {
      return false;
    } // https://bugs.chromium.org/p/v8/issues/detail?id=3056


    var test2 = {};

    for (var i = 0; i < 10; i++) {
      test2['_' + String.fromCharCode(i)] = i;
    }

    var order2 = Object.getOwnPropertyNames(test2).map(function (n) {
      return test2[n];
    });

    if (order2.join('') !== '0123456789') {
      return false;
    } // https://bugs.chromium.org/p/v8/issues/detail?id=3056


    var test3 = {};
    'abcdefghijklmnopqrst'.split('').forEach(function (letter) {
      test3[letter] = letter;
    });

    if (Object.keys(Object.assign({}, test3)).join('') !== 'abcdefghijklmnopqrst') {
      return false;
    }

    return true;
  } catch (err) {
    // We don't expect any of the above to throw, but better to be safe.
    return false;
  }
}

var objectAssign = shouldUseNative() ? Object.assign : function (target, source) {
  var from;
  var to = toObject(target);
  var symbols;

  for (var s = 1; s < arguments.length; s++) {
    from = Object(arguments[s]);

    for (var key in from) {
      if (hasOwnProperty.call(from, key)) {
        to[key] = from[key];
      }
    }

    if (getOwnPropertySymbols) {
      symbols = getOwnPropertySymbols(from);

      for (var i = 0; i < symbols.length; i++) {
        if (propIsEnumerable.call(from, symbols[i])) {
          to[symbols[i]] = from[symbols[i]];
        }
      }
    }
  }

  return to;
};

/** @license React v17.0.2
 * react.production.min.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

var l = objectAssign,
    n = 60103,
    p = 60106;

react_production_min.Fragment = 60107;
react_production_min.StrictMode = 60108;
react_production_min.Profiler = 60114;
var q = 60109,
    r = 60110,
    t = 60112;
react_production_min.Suspense = 60113;
var u = 60115,
    v = 60116;

if ("function" === typeof Symbol && Symbol.for) {
  var w = Symbol.for;
  n = w("react.element");
  p = w("react.portal");
  react_production_min.Fragment = w("react.fragment");
  react_production_min.StrictMode = w("react.strict_mode");
  react_production_min.Profiler = w("react.profiler");
  q = w("react.provider");
  r = w("react.context");
  t = w("react.forward_ref");
  react_production_min.Suspense = w("react.suspense");
  u = w("react.memo");
  v = w("react.lazy");
}

var x = "function" === typeof Symbol && Symbol.iterator;

function y(a) {
  if (null === a || "object" !== typeof a) return null;
  a = x && a[x] || a["@@iterator"];
  return "function" === typeof a ? a : null;
}

function z(a) {
  for (var b = "https://reactjs.org/docs/error-decoder.html?invariant=" + a, c = 1; c < arguments.length; c++) {
    b += "&args[]=" + encodeURIComponent(arguments[c]);
  }

  return "Minified React error #" + a + "; visit " + b + " for the full message or use the non-minified dev environment for full errors and additional helpful warnings.";
}

var A = {
  isMounted: function isMounted() {
    return !1;
  },
  enqueueForceUpdate: function enqueueForceUpdate() {},
  enqueueReplaceState: function enqueueReplaceState() {},
  enqueueSetState: function enqueueSetState() {}
},
    B = {};

function C(a, b, c) {
  this.props = a;
  this.context = b;
  this.refs = B;
  this.updater = c || A;
}

C.prototype.isReactComponent = {};

C.prototype.setState = function (a, b) {
  if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error(z(85));
  this.updater.enqueueSetState(this, a, b, "setState");
};

C.prototype.forceUpdate = function (a) {
  this.updater.enqueueForceUpdate(this, a, "forceUpdate");
};

function D() {}

D.prototype = C.prototype;

function E(a, b, c) {
  this.props = a;
  this.context = b;
  this.refs = B;
  this.updater = c || A;
}

var F = E.prototype = new D();
F.constructor = E;
l(F, C.prototype);
F.isPureReactComponent = !0;
var G = {
  current: null
},
    H = Object.prototype.hasOwnProperty,
    I = {
  key: !0,
  ref: !0,
  __self: !0,
  __source: !0
};

function J(a, b, c) {
  var e,
      d = {},
      k = null,
      h = null;
  if (null != b) for (e in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) {
    H.call(b, e) && !I.hasOwnProperty(e) && (d[e] = b[e]);
  }
  var g = arguments.length - 2;
  if (1 === g) d.children = c;else if (1 < g) {
    for (var f = Array(g), m = 0; m < g; m++) {
      f[m] = arguments[m + 2];
    }

    d.children = f;
  }
  if (a && a.defaultProps) for (e in g = a.defaultProps, g) {
    void 0 === d[e] && (d[e] = g[e]);
  }
  return {
    $$typeof: n,
    type: a,
    key: k,
    ref: h,
    props: d,
    _owner: G.current
  };
}

function K(a, b) {
  return {
    $$typeof: n,
    type: a.type,
    key: b,
    ref: a.ref,
    props: a.props,
    _owner: a._owner
  };
}

function L(a) {
  return "object" === typeof a && null !== a && a.$$typeof === n;
}

function escape(a) {
  var b = {
    "=": "=0",
    ":": "=2"
  };
  return "$" + a.replace(/[=:]/g, function (a) {
    return b[a];
  });
}

var M = /\/+/g;

function N(a, b) {
  return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
}

function O(a, b, c, e, d) {
  var k = typeof a;
  if ("undefined" === k || "boolean" === k) a = null;
  var h = !1;
  if (null === a) h = !0;else switch (k) {
    case "string":
    case "number":
      h = !0;
      break;

    case "object":
      switch (a.$$typeof) {
        case n:
        case p:
          h = !0;
      }

  }
  if (h) return h = a, d = d(h), a = "" === e ? "." + N(h, 0) : e, Array.isArray(d) ? (c = "", null != a && (c = a.replace(M, "$&/") + "/"), O(d, b, c, "", function (a) {
    return a;
  })) : null != d && (L(d) && (d = K(d, c + (!d.key || h && h.key === d.key ? "" : ("" + d.key).replace(M, "$&/") + "/") + a)), b.push(d)), 1;
  h = 0;
  e = "" === e ? "." : e + ":";
  if (Array.isArray(a)) for (var g = 0; g < a.length; g++) {
    k = a[g];
    var f = e + N(k, g);
    h += O(k, b, c, f, d);
  } else if (f = y(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done;) {
    k = k.value, f = e + N(k, g++), h += O(k, b, c, f, d);
  } else if ("object" === k) throw b = "" + a, Error(z(31, "[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b));
  return h;
}

function P(a, b, c) {
  if (null == a) return a;
  var e = [],
      d = 0;
  O(a, e, "", "", function (a) {
    return b.call(c, a, d++);
  });
  return e;
}

function Q(a) {
  if (-1 === a._status) {
    var b = a._result;
    b = b();
    a._status = 0;
    a._result = b;
    b.then(function (b) {
      0 === a._status && (b = b.default, a._status = 1, a._result = b);
    }, function (b) {
      0 === a._status && (a._status = 2, a._result = b);
    });
  }

  if (1 === a._status) return a._result;
  throw a._result;
}

var R = {
  current: null
};

function S() {
  var a = R.current;
  if (null === a) throw Error(z(321));
  return a;
}

var T = {
  ReactCurrentDispatcher: R,
  ReactCurrentBatchConfig: {
    transition: 0
  },
  ReactCurrentOwner: G,
  IsSomeRendererActing: {
    current: !1
  },
  assign: l
};
react_production_min.Children = {
  map: P,
  forEach: function forEach(a, b, c) {
    P(a, function () {
      b.apply(this, arguments);
    }, c);
  },
  count: function count(a) {
    var b = 0;
    P(a, function () {
      b++;
    });
    return b;
  },
  toArray: function toArray(a) {
    return P(a, function (a) {
      return a;
    }) || [];
  },
  only: function only(a) {
    if (!L(a)) throw Error(z(143));
    return a;
  }
};
react_production_min.Component = C;
react_production_min.PureComponent = E;
react_production_min.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = T;

react_production_min.cloneElement = function (a, b, c) {
  if (null === a || void 0 === a) throw Error(z(267, a));
  var e = l({}, a.props),
      d = a.key,
      k = a.ref,
      h = a._owner;

  if (null != b) {
    void 0 !== b.ref && (k = b.ref, h = G.current);
    void 0 !== b.key && (d = "" + b.key);
    if (a.type && a.type.defaultProps) var g = a.type.defaultProps;

    for (f in b) {
      H.call(b, f) && !I.hasOwnProperty(f) && (e[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
    }
  }

  var f = arguments.length - 2;
  if (1 === f) e.children = c;else if (1 < f) {
    g = Array(f);

    for (var m = 0; m < f; m++) {
      g[m] = arguments[m + 2];
    }

    e.children = g;
  }
  return {
    $$typeof: n,
    type: a.type,
    key: d,
    ref: k,
    props: e,
    _owner: h
  };
};

react_production_min.createContext = function (a, b) {
  void 0 === b && (b = null);
  a = {
    $$typeof: r,
    _calculateChangedBits: b,
    _currentValue: a,
    _currentValue2: a,
    _threadCount: 0,
    Provider: null,
    Consumer: null
  };
  a.Provider = {
    $$typeof: q,
    _context: a
  };
  return a.Consumer = a;
};

react_production_min.createElement = J;

react_production_min.createFactory = function (a) {
  var b = J.bind(null, a);
  b.type = a;
  return b;
};

react_production_min.createRef = function () {
  return {
    current: null
  };
};

react_production_min.forwardRef = function (a) {
  return {
    $$typeof: t,
    render: a
  };
};

react_production_min.isValidElement = L;

react_production_min.lazy = function (a) {
  return {
    $$typeof: v,
    _payload: {
      _status: -1,
      _result: a
    },
    _init: Q
  };
};

react_production_min.memo = function (a, b) {
  return {
    $$typeof: u,
    type: a,
    compare: void 0 === b ? null : b
  };
};

react_production_min.useCallback = function (a, b) {
  return S().useCallback(a, b);
};

react_production_min.useContext = function (a, b) {
  return S().useContext(a, b);
};

react_production_min.useDebugValue = function () {};

react_production_min.useEffect = function (a, b) {
  return S().useEffect(a, b);
};

react_production_min.useImperativeHandle = function (a, b, c) {
  return S().useImperativeHandle(a, b, c);
};

react_production_min.useLayoutEffect = function (a, b) {
  return S().useLayoutEffect(a, b);
};

react_production_min.useMemo = function (a, b) {
  return S().useMemo(a, b);
};

react_production_min.useReducer = function (a, b, c) {
  return S().useReducer(a, b, c);
};

react_production_min.useRef = function (a) {
  return S().useRef(a);
};

react_production_min.useState = function (a) {
  return S().useState(a);
};

react_production_min.version = "17.0.2";

var react_development = {};

/** @license React v17.0.2
 * react.development.js
 *
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

(function (exports) {

if (process.env.NODE_ENV !== "production") {
  (function () {

    var _assign = objectAssign; // TODO: this is special because it gets imported during build.


    var ReactVersion = '17.0.2'; // ATTENTION
    // When adding new symbols to this file,
    // Please consider also adding to 'react-devtools-shared/src/backend/ReactSymbols'
    // The Symbol used to tag the ReactElement-like types. If there is no native Symbol
    // nor polyfill, then a plain number is used for performance.

    var REACT_ELEMENT_TYPE = 0xeac7;
    var REACT_PORTAL_TYPE = 0xeaca;
    exports.Fragment = 0xeacb;
    exports.StrictMode = 0xeacc;
    exports.Profiler = 0xead2;
    var REACT_PROVIDER_TYPE = 0xeacd;
    var REACT_CONTEXT_TYPE = 0xeace;
    var REACT_FORWARD_REF_TYPE = 0xead0;
    exports.Suspense = 0xead1;
    var REACT_SUSPENSE_LIST_TYPE = 0xead8;
    var REACT_MEMO_TYPE = 0xead3;
    var REACT_LAZY_TYPE = 0xead4;
    var REACT_BLOCK_TYPE = 0xead9;
    var REACT_SERVER_BLOCK_TYPE = 0xeada;
    var REACT_FUNDAMENTAL_TYPE = 0xead5;
    var REACT_DEBUG_TRACING_MODE_TYPE = 0xeae1;
    var REACT_LEGACY_HIDDEN_TYPE = 0xeae3;

    if (typeof Symbol === 'function' && Symbol.for) {
      var symbolFor = Symbol.for;
      REACT_ELEMENT_TYPE = symbolFor('react.element');
      REACT_PORTAL_TYPE = symbolFor('react.portal');
      exports.Fragment = symbolFor('react.fragment');
      exports.StrictMode = symbolFor('react.strict_mode');
      exports.Profiler = symbolFor('react.profiler');
      REACT_PROVIDER_TYPE = symbolFor('react.provider');
      REACT_CONTEXT_TYPE = symbolFor('react.context');
      REACT_FORWARD_REF_TYPE = symbolFor('react.forward_ref');
      exports.Suspense = symbolFor('react.suspense');
      REACT_SUSPENSE_LIST_TYPE = symbolFor('react.suspense_list');
      REACT_MEMO_TYPE = symbolFor('react.memo');
      REACT_LAZY_TYPE = symbolFor('react.lazy');
      REACT_BLOCK_TYPE = symbolFor('react.block');
      REACT_SERVER_BLOCK_TYPE = symbolFor('react.server.block');
      REACT_FUNDAMENTAL_TYPE = symbolFor('react.fundamental');
      symbolFor('react.scope');
      symbolFor('react.opaque.id');
      REACT_DEBUG_TRACING_MODE_TYPE = symbolFor('react.debug_trace_mode');
      symbolFor('react.offscreen');
      REACT_LEGACY_HIDDEN_TYPE = symbolFor('react.legacy_hidden');
    }

    var MAYBE_ITERATOR_SYMBOL = typeof Symbol === 'function' && Symbol.iterator;
    var FAUX_ITERATOR_SYMBOL = '@@iterator';

    function getIteratorFn(maybeIterable) {
      if (maybeIterable === null || typeof maybeIterable !== 'object') {
        return null;
      }

      var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];

      if (typeof maybeIterator === 'function') {
        return maybeIterator;
      }

      return null;
    }
    /**
     * Keeps track of the current dispatcher.
     */


    var ReactCurrentDispatcher = {
      /**
       * @internal
       * @type {ReactComponent}
       */
      current: null
    };
    /**
     * Keeps track of the current batch's configuration such as how long an update
     * should suspend for if it needs to.
     */

    var ReactCurrentBatchConfig = {
      transition: 0
    };
    /**
     * Keeps track of the current owner.
     *
     * The current owner is the component who should own any components that are
     * currently being constructed.
     */

    var ReactCurrentOwner = {
      /**
       * @internal
       * @type {ReactComponent}
       */
      current: null
    };
    var ReactDebugCurrentFrame = {};
    var currentExtraStackFrame = null;

    function setExtraStackFrame(stack) {
      {
        currentExtraStackFrame = stack;
      }
    }

    {
      ReactDebugCurrentFrame.setExtraStackFrame = function (stack) {
        {
          currentExtraStackFrame = stack;
        }
      }; // Stack implementation injected by the current renderer.


      ReactDebugCurrentFrame.getCurrentStack = null;

      ReactDebugCurrentFrame.getStackAddendum = function () {
        var stack = ''; // Add an extra top frame while an element is being validated

        if (currentExtraStackFrame) {
          stack += currentExtraStackFrame;
        } // Delegate to the injected renderer-specific implementation


        var impl = ReactDebugCurrentFrame.getCurrentStack;

        if (impl) {
          stack += impl() || '';
        }

        return stack;
      };
    }
    /**
     * Used by act() to track whether you're inside an act() scope.
     */

    var IsSomeRendererActing = {
      current: false
    };
    var ReactSharedInternals = {
      ReactCurrentDispatcher: ReactCurrentDispatcher,
      ReactCurrentBatchConfig: ReactCurrentBatchConfig,
      ReactCurrentOwner: ReactCurrentOwner,
      IsSomeRendererActing: IsSomeRendererActing,
      // Used by renderers to avoid bundling object-assign twice in UMD bundles:
      assign: _assign
    };
    {
      ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
    } // by calls to these methods by a Babel plugin.
    //
    // In PROD (or in packages without access to React internals),
    // they are left as they are instead.

    function warn(format) {
      {
        for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
          args[_key - 1] = arguments[_key];
        }

        printWarning('warn', format, args);
      }
    }

    function error(format) {
      {
        for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
          args[_key2 - 1] = arguments[_key2];
        }

        printWarning('error', format, args);
      }
    }

    function printWarning(level, format, args) {
      // When changing this logic, you might want to also
      // update consoleWithStackDev.www.js as well.
      {
        var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
        var stack = ReactDebugCurrentFrame.getStackAddendum();

        if (stack !== '') {
          format += '%s';
          args = args.concat([stack]);
        }

        var argsWithFormat = args.map(function (item) {
          return '' + item;
        }); // Careful: RN currently depends on this prefix

        argsWithFormat.unshift('Warning: ' + format); // We intentionally don't use spread (or .apply) directly because it
        // breaks IE9: https://github.com/facebook/react/issues/13610
        // eslint-disable-next-line react-internal/no-production-logging

        Function.prototype.apply.call(console[level], console, argsWithFormat);
      }
    }

    var didWarnStateUpdateForUnmountedComponent = {};

    function warnNoop(publicInstance, callerName) {
      {
        var _constructor = publicInstance.constructor;
        var componentName = _constructor && (_constructor.displayName || _constructor.name) || 'ReactClass';
        var warningKey = componentName + "." + callerName;

        if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
          return;
        }

        error("Can't call %s on a component that is not yet mounted. " + 'This is a no-op, but it might indicate a bug in your application. ' + 'Instead, assign to `this.state` directly or define a `state = {};` ' + 'class property with the desired state in the %s component.', callerName, componentName);
        didWarnStateUpdateForUnmountedComponent[warningKey] = true;
      }
    }
    /**
     * This is the abstract API for an update queue.
     */


    var ReactNoopUpdateQueue = {
      /**
       * Checks whether or not this composite component is mounted.
       * @param {ReactClass} publicInstance The instance we want to test.
       * @return {boolean} True if mounted, false otherwise.
       * @protected
       * @final
       */
      isMounted: function isMounted(publicInstance) {
        return false;
      },

      /**
       * Forces an update. This should only be invoked when it is known with
       * certainty that we are **not** in a DOM transaction.
       *
       * You may want to call this when you know that some deeper aspect of the
       * component's state has changed but `setState` was not called.
       *
       * This will not invoke `shouldComponentUpdate`, but it will invoke
       * `componentWillUpdate` and `componentDidUpdate`.
       *
       * @param {ReactClass} publicInstance The instance that should rerender.
       * @param {?function} callback Called after component is updated.
       * @param {?string} callerName name of the calling function in the public API.
       * @internal
       */
      enqueueForceUpdate: function enqueueForceUpdate(publicInstance, callback, callerName) {
        warnNoop(publicInstance, 'forceUpdate');
      },

      /**
       * Replaces all of the state. Always use this or `setState` to mutate state.
       * You should treat `this.state` as immutable.
       *
       * There is no guarantee that `this.state` will be immediately updated, so
       * accessing `this.state` after calling this method may return the old value.
       *
       * @param {ReactClass} publicInstance The instance that should rerender.
       * @param {object} completeState Next state.
       * @param {?function} callback Called after component is updated.
       * @param {?string} callerName name of the calling function in the public API.
       * @internal
       */
      enqueueReplaceState: function enqueueReplaceState(publicInstance, completeState, callback, callerName) {
        warnNoop(publicInstance, 'replaceState');
      },

      /**
       * Sets a subset of the state. This only exists because _pendingState is
       * internal. This provides a merging strategy that is not available to deep
       * properties which is confusing. TODO: Expose pendingState or don't use it
       * during the merge.
       *
       * @param {ReactClass} publicInstance The instance that should rerender.
       * @param {object} partialState Next partial state to be merged with state.
       * @param {?function} callback Called after component is updated.
       * @param {?string} Name of the calling function in the public API.
       * @internal
       */
      enqueueSetState: function enqueueSetState(publicInstance, partialState, callback, callerName) {
        warnNoop(publicInstance, 'setState');
      }
    };
    var emptyObject = {};
    {
      Object.freeze(emptyObject);
    }
    /**
     * Base class helpers for the updating state of a component.
     */

    function Component(props, context, updater) {
      this.props = props;
      this.context = context; // If a component has string refs, we will assign a different object later.

      this.refs = emptyObject; // We initialize the default updater but the real one gets injected by the
      // renderer.

      this.updater = updater || ReactNoopUpdateQueue;
    }

    Component.prototype.isReactComponent = {};
    /**
     * Sets a subset of the state. Always use this to mutate
     * state. You should treat `this.state` as immutable.
     *
     * There is no guarantee that `this.state` will be immediately updated, so
     * accessing `this.state` after calling this method may return the old value.
     *
     * There is no guarantee that calls to `setState` will run synchronously,
     * as they may eventually be batched together.  You can provide an optional
     * callback that will be executed when the call to setState is actually
     * completed.
     *
     * When a function is provided to setState, it will be called at some point in
     * the future (not synchronously). It will be called with the up to date
     * component arguments (state, props, context). These values can be different
     * from this.* because your function may be called after receiveProps but before
     * shouldComponentUpdate, and this new state, props, and context will not yet be
     * assigned to this.
     *
     * @param {object|function} partialState Next partial state or function to
     *        produce next partial state to be merged with current state.
     * @param {?function} callback Called after state is updated.
     * @final
     * @protected
     */

    Component.prototype.setState = function (partialState, callback) {
      if (!(typeof partialState === 'object' || typeof partialState === 'function' || partialState == null)) {
        {
          throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
        }
      }

      this.updater.enqueueSetState(this, partialState, callback, 'setState');
    };
    /**
     * Forces an update. This should only be invoked when it is known with
     * certainty that we are **not** in a DOM transaction.
     *
     * You may want to call this when you know that some deeper aspect of the
     * component's state has changed but `setState` was not called.
     *
     * This will not invoke `shouldComponentUpdate`, but it will invoke
     * `componentWillUpdate` and `componentDidUpdate`.
     *
     * @param {?function} callback Called after update is complete.
     * @final
     * @protected
     */


    Component.prototype.forceUpdate = function (callback) {
      this.updater.enqueueForceUpdate(this, callback, 'forceUpdate');
    };
    /**
     * Deprecated APIs. These APIs used to exist on classic React classes but since
     * we would like to deprecate them, we're not going to move them over to this
     * modern base class. Instead, we define a getter that warns if it's accessed.
     */


    {
      var deprecatedAPIs = {
        isMounted: ['isMounted', 'Instead, make sure to clean up subscriptions and pending requests in ' + 'componentWillUnmount to prevent memory leaks.'],
        replaceState: ['replaceState', 'Refactor your code to use setState instead (see ' + 'https://github.com/facebook/react/issues/3236).']
      };

      var defineDeprecationWarning = function defineDeprecationWarning(methodName, info) {
        Object.defineProperty(Component.prototype, methodName, {
          get: function get() {
            warn('%s(...) is deprecated in plain JavaScript React classes. %s', info[0], info[1]);
            return undefined;
          }
        });
      };

      for (var fnName in deprecatedAPIs) {
        if (deprecatedAPIs.hasOwnProperty(fnName)) {
          defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
        }
      }
    }

    function ComponentDummy() {}

    ComponentDummy.prototype = Component.prototype;
    /**
     * Convenience component with default shallow equality check for sCU.
     */

    function PureComponent(props, context, updater) {
      this.props = props;
      this.context = context; // If a component has string refs, we will assign a different object later.

      this.refs = emptyObject;
      this.updater = updater || ReactNoopUpdateQueue;
    }

    var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
    pureComponentPrototype.constructor = PureComponent; // Avoid an extra prototype jump for these methods.

    _assign(pureComponentPrototype, Component.prototype);

    pureComponentPrototype.isPureReactComponent = true; // an immutable object with a single mutable value

    function createRef() {
      var refObject = {
        current: null
      };
      {
        Object.seal(refObject);
      }
      return refObject;
    }

    function getWrappedName(outerType, innerType, wrapperName) {
      var functionName = innerType.displayName || innerType.name || '';
      return outerType.displayName || (functionName !== '' ? wrapperName + "(" + functionName + ")" : wrapperName);
    }

    function getContextName(type) {
      return type.displayName || 'Context';
    }

    function getComponentName(type) {
      if (type == null) {
        // Host root, text node or just invalid type.
        return null;
      }

      {
        if (typeof type.tag === 'number') {
          error('Received an unexpected object in getComponentName(). ' + 'This is likely a bug in React. Please file an issue.');
        }
      }

      if (typeof type === 'function') {
        return type.displayName || type.name || null;
      }

      if (typeof type === 'string') {
        return type;
      }

      switch (type) {
        case exports.Fragment:
          return 'Fragment';

        case REACT_PORTAL_TYPE:
          return 'Portal';

        case exports.Profiler:
          return 'Profiler';

        case exports.StrictMode:
          return 'StrictMode';

        case exports.Suspense:
          return 'Suspense';

        case REACT_SUSPENSE_LIST_TYPE:
          return 'SuspenseList';
      }

      if (typeof type === 'object') {
        switch (type.$$typeof) {
          case REACT_CONTEXT_TYPE:
            var context = type;
            return getContextName(context) + '.Consumer';

          case REACT_PROVIDER_TYPE:
            var provider = type;
            return getContextName(provider._context) + '.Provider';

          case REACT_FORWARD_REF_TYPE:
            return getWrappedName(type, type.render, 'ForwardRef');

          case REACT_MEMO_TYPE:
            return getComponentName(type.type);

          case REACT_BLOCK_TYPE:
            return getComponentName(type._render);

          case REACT_LAZY_TYPE:
            {
              var lazyComponent = type;
              var payload = lazyComponent._payload;
              var init = lazyComponent._init;

              try {
                return getComponentName(init(payload));
              } catch (x) {
                return null;
              }
            }
        }
      }

      return null;
    }

    var hasOwnProperty = Object.prototype.hasOwnProperty;
    var RESERVED_PROPS = {
      key: true,
      ref: true,
      __self: true,
      __source: true
    };
    var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
    {
      didWarnAboutStringRefs = {};
    }

    function hasValidRef(config) {
      {
        if (hasOwnProperty.call(config, 'ref')) {
          var getter = Object.getOwnPropertyDescriptor(config, 'ref').get;

          if (getter && getter.isReactWarning) {
            return false;
          }
        }
      }
      return config.ref !== undefined;
    }

    function hasValidKey(config) {
      {
        if (hasOwnProperty.call(config, 'key')) {
          var getter = Object.getOwnPropertyDescriptor(config, 'key').get;

          if (getter && getter.isReactWarning) {
            return false;
          }
        }
      }
      return config.key !== undefined;
    }

    function defineKeyPropWarningGetter(props, displayName) {
      var warnAboutAccessingKey = function warnAboutAccessingKey() {
        {
          if (!specialPropKeyWarningShown) {
            specialPropKeyWarningShown = true;
            error('%s: `key` is not a prop. Trying to access it will result ' + 'in `undefined` being returned. If you need to access the same ' + 'value within the child component, you should pass it as a different ' + 'prop. (https://reactjs.org/link/special-props)', displayName);
          }
        }
      };

      warnAboutAccessingKey.isReactWarning = true;
      Object.defineProperty(props, 'key', {
        get: warnAboutAccessingKey,
        configurable: true
      });
    }

    function defineRefPropWarningGetter(props, displayName) {
      var warnAboutAccessingRef = function warnAboutAccessingRef() {
        {
          if (!specialPropRefWarningShown) {
            specialPropRefWarningShown = true;
            error('%s: `ref` is not a prop. Trying to access it will result ' + 'in `undefined` being returned. If you need to access the same ' + 'value within the child component, you should pass it as a different ' + 'prop. (https://reactjs.org/link/special-props)', displayName);
          }
        }
      };

      warnAboutAccessingRef.isReactWarning = true;
      Object.defineProperty(props, 'ref', {
        get: warnAboutAccessingRef,
        configurable: true
      });
    }

    function warnIfStringRefCannotBeAutoConverted(config) {
      {
        if (typeof config.ref === 'string' && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
          var componentName = getComponentName(ReactCurrentOwner.current.type);

          if (!didWarnAboutStringRefs[componentName]) {
            error('Component "%s" contains the string ref "%s". ' + 'Support for string refs will be removed in a future major release. ' + 'This case cannot be automatically converted to an arrow function. ' + 'We ask you to manually fix this case by using useRef() or createRef() instead. ' + 'Learn more about using refs safely here: ' + 'https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
            didWarnAboutStringRefs[componentName] = true;
          }
        }
      }
    }
    /**
     * Factory method to create a new React element. This no longer adheres to
     * the class pattern, so do not use new to call it. Also, instanceof check
     * will not work. Instead test $$typeof field against Symbol.for('react.element') to check
     * if something is a React Element.
     *
     * @param {*} type
     * @param {*} props
     * @param {*} key
     * @param {string|object} ref
     * @param {*} owner
     * @param {*} self A *temporary* helper to detect places where `this` is
     * different from the `owner` when React.createElement is called, so that we
     * can warn. We want to get rid of owner and replace string `ref`s with arrow
     * functions, and as long as `this` and owner are the same, there will be no
     * change in behavior.
     * @param {*} source An annotation object (added by a transpiler or otherwise)
     * indicating filename, line number, and/or other information.
     * @internal
     */


    var ReactElement = function ReactElement(type, key, ref, self, source, owner, props) {
      var element = {
        // This tag allows us to uniquely identify this as a React Element
        $$typeof: REACT_ELEMENT_TYPE,
        // Built-in properties that belong on the element
        type: type,
        key: key,
        ref: ref,
        props: props,
        // Record the component responsible for creating this element.
        _owner: owner
      };
      {
        // The validation flag is currently mutative. We put it on
        // an external backing store so that we can freeze the whole object.
        // This can be replaced with a WeakMap once they are implemented in
        // commonly used development environments.
        element._store = {}; // To make comparing ReactElements easier for testing purposes, we make
        // the validation flag non-enumerable (where possible, which should
        // include every environment we run tests in), so the test framework
        // ignores it.

        Object.defineProperty(element._store, 'validated', {
          configurable: false,
          enumerable: false,
          writable: true,
          value: false
        }); // self and source are DEV only properties.

        Object.defineProperty(element, '_self', {
          configurable: false,
          enumerable: false,
          writable: false,
          value: self
        }); // Two elements created in two different places should be considered
        // equal for testing purposes and therefore we hide it from enumeration.

        Object.defineProperty(element, '_source', {
          configurable: false,
          enumerable: false,
          writable: false,
          value: source
        });

        if (Object.freeze) {
          Object.freeze(element.props);
          Object.freeze(element);
        }
      }
      return element;
    };
    /**
     * Create and return a new ReactElement of the given type.
     * See https://reactjs.org/docs/react-api.html#createelement
     */


    function createElement(type, config, children) {
      var propName; // Reserved names are extracted

      var props = {};
      var key = null;
      var ref = null;
      var self = null;
      var source = null;

      if (config != null) {
        if (hasValidRef(config)) {
          ref = config.ref;
          {
            warnIfStringRefCannotBeAutoConverted(config);
          }
        }

        if (hasValidKey(config)) {
          key = '' + config.key;
        }

        self = config.__self === undefined ? null : config.__self;
        source = config.__source === undefined ? null : config.__source; // Remaining properties are added to a new props object

        for (propName in config) {
          if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
            props[propName] = config[propName];
          }
        }
      } // Children can be more than one argument, and those are transferred onto
      // the newly allocated props object.


      var childrenLength = arguments.length - 2;

      if (childrenLength === 1) {
        props.children = children;
      } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);

        for (var i = 0; i < childrenLength; i++) {
          childArray[i] = arguments[i + 2];
        }

        {
          if (Object.freeze) {
            Object.freeze(childArray);
          }
        }
        props.children = childArray;
      } // Resolve default props


      if (type && type.defaultProps) {
        var defaultProps = type.defaultProps;

        for (propName in defaultProps) {
          if (props[propName] === undefined) {
            props[propName] = defaultProps[propName];
          }
        }
      }

      {
        if (key || ref) {
          var displayName = typeof type === 'function' ? type.displayName || type.name || 'Unknown' : type;

          if (key) {
            defineKeyPropWarningGetter(props, displayName);
          }

          if (ref) {
            defineRefPropWarningGetter(props, displayName);
          }
        }
      }
      return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
    }

    function cloneAndReplaceKey(oldElement, newKey) {
      var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
      return newElement;
    }
    /**
     * Clone and return a new ReactElement using element as the starting point.
     * See https://reactjs.org/docs/react-api.html#cloneelement
     */


    function cloneElement(element, config, children) {
      if (!!(element === null || element === undefined)) {
        {
          throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
        }
      }

      var propName; // Original props are copied

      var props = _assign({}, element.props); // Reserved names are extracted


      var key = element.key;
      var ref = element.ref; // Self is preserved since the owner is preserved.

      var self = element._self; // Source is preserved since cloneElement is unlikely to be targeted by a
      // transpiler, and the original source is probably a better indicator of the
      // true owner.

      var source = element._source; // Owner will be preserved, unless ref is overridden

      var owner = element._owner;

      if (config != null) {
        if (hasValidRef(config)) {
          // Silently steal the ref from the parent.
          ref = config.ref;
          owner = ReactCurrentOwner.current;
        }

        if (hasValidKey(config)) {
          key = '' + config.key;
        } // Remaining properties override existing props


        var defaultProps;

        if (element.type && element.type.defaultProps) {
          defaultProps = element.type.defaultProps;
        }

        for (propName in config) {
          if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
            if (config[propName] === undefined && defaultProps !== undefined) {
              // Resolve default props
              props[propName] = defaultProps[propName];
            } else {
              props[propName] = config[propName];
            }
          }
        }
      } // Children can be more than one argument, and those are transferred onto
      // the newly allocated props object.


      var childrenLength = arguments.length - 2;

      if (childrenLength === 1) {
        props.children = children;
      } else if (childrenLength > 1) {
        var childArray = Array(childrenLength);

        for (var i = 0; i < childrenLength; i++) {
          childArray[i] = arguments[i + 2];
        }

        props.children = childArray;
      }

      return ReactElement(element.type, key, ref, self, source, owner, props);
    }
    /**
     * Verifies the object is a ReactElement.
     * See https://reactjs.org/docs/react-api.html#isvalidelement
     * @param {?object} object
     * @return {boolean} True if `object` is a ReactElement.
     * @final
     */


    function isValidElement(object) {
      return typeof object === 'object' && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
    }

    var SEPARATOR = '.';
    var SUBSEPARATOR = ':';
    /**
     * Escape and wrap key so it is safe to use as a reactid
     *
     * @param {string} key to be escaped.
     * @return {string} the escaped key.
     */

    function escape(key) {
      var escapeRegex = /[=:]/g;
      var escaperLookup = {
        '=': '=0',
        ':': '=2'
      };
      var escapedString = key.replace(escapeRegex, function (match) {
        return escaperLookup[match];
      });
      return '$' + escapedString;
    }
    /**
     * TODO: Test that a single child and an array with one item have the same key
     * pattern.
     */


    var didWarnAboutMaps = false;
    var userProvidedKeyEscapeRegex = /\/+/g;

    function escapeUserProvidedKey(text) {
      return text.replace(userProvidedKeyEscapeRegex, '$&/');
    }
    /**
     * Generate a key string that identifies a element within a set.
     *
     * @param {*} element A element that could contain a manual key.
     * @param {number} index Index that is used if a manual key is not provided.
     * @return {string}
     */


    function getElementKey(element, index) {
      // Do some typechecking here since we call this blindly. We want to ensure
      // that we don't block potential future ES APIs.
      if (typeof element === 'object' && element !== null && element.key != null) {
        // Explicit key
        return escape('' + element.key);
      } // Implicit key determined by the index in the set


      return index.toString(36);
    }

    function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
      var type = typeof children;

      if (type === 'undefined' || type === 'boolean') {
        // All of the above are perceived as null.
        children = null;
      }

      var invokeCallback = false;

      if (children === null) {
        invokeCallback = true;
      } else {
        switch (type) {
          case 'string':
          case 'number':
            invokeCallback = true;
            break;

          case 'object':
            switch (children.$$typeof) {
              case REACT_ELEMENT_TYPE:
              case REACT_PORTAL_TYPE:
                invokeCallback = true;
            }

        }
      }

      if (invokeCallback) {
        var _child = children;
        var mappedChild = callback(_child); // If it's the only child, treat the name as if it was wrapped in an array
        // so that it's consistent if the number of children grows:

        var childKey = nameSoFar === '' ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;

        if (Array.isArray(mappedChild)) {
          var escapedChildKey = '';

          if (childKey != null) {
            escapedChildKey = escapeUserProvidedKey(childKey) + '/';
          }

          mapIntoArray(mappedChild, array, escapedChildKey, '', function (c) {
            return c;
          });
        } else if (mappedChild != null) {
          if (isValidElement(mappedChild)) {
            mappedChild = cloneAndReplaceKey(mappedChild, // Keep both the (mapped) and old keys if they differ, just as
            // traverseAllChildren used to do for objects as children
            escapedPrefix + ( // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
            mappedChild.key && (!_child || _child.key !== mappedChild.key) ? // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
            escapeUserProvidedKey('' + mappedChild.key) + '/' : '') + childKey);
          }

          array.push(mappedChild);
        }

        return 1;
      }

      var child;
      var nextName;
      var subtreeCount = 0; // Count of children found in the current subtree.

      var nextNamePrefix = nameSoFar === '' ? SEPARATOR : nameSoFar + SUBSEPARATOR;

      if (Array.isArray(children)) {
        for (var i = 0; i < children.length; i++) {
          child = children[i];
          nextName = nextNamePrefix + getElementKey(child, i);
          subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
        }
      } else {
        var iteratorFn = getIteratorFn(children);

        if (typeof iteratorFn === 'function') {
          var iterableChildren = children;
          {
            // Warn about using Maps as children
            if (iteratorFn === iterableChildren.entries) {
              if (!didWarnAboutMaps) {
                warn('Using Maps as children is not supported. ' + 'Use an array of keyed ReactElements instead.');
              }

              didWarnAboutMaps = true;
            }
          }
          var iterator = iteratorFn.call(iterableChildren);
          var step;
          var ii = 0;

          while (!(step = iterator.next()).done) {
            child = step.value;
            nextName = nextNamePrefix + getElementKey(child, ii++);
            subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
          }
        } else if (type === 'object') {
          var childrenString = '' + children;
          {
            {
              throw Error("Objects are not valid as a React child (found: " + (childrenString === '[object Object]' ? 'object with keys {' + Object.keys(children).join(', ') + '}' : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
        }
      }

      return subtreeCount;
    }
    /**
     * Maps children that are typically specified as `props.children`.
     *
     * See https://reactjs.org/docs/react-api.html#reactchildrenmap
     *
     * The provided mapFunction(child, index) will be called for each
     * leaf child.
     *
     * @param {?*} children Children tree container.
     * @param {function(*, int)} func The map function.
     * @param {*} context Context for mapFunction.
     * @return {object} Object containing the ordered map of results.
     */


    function mapChildren(children, func, context) {
      if (children == null) {
        return children;
      }

      var result = [];
      var count = 0;
      mapIntoArray(children, result, '', '', function (child) {
        return func.call(context, child, count++);
      });
      return result;
    }
    /**
     * Count the number of children that are typically specified as
     * `props.children`.
     *
     * See https://reactjs.org/docs/react-api.html#reactchildrencount
     *
     * @param {?*} children Children tree container.
     * @return {number} The number of children.
     */


    function countChildren(children) {
      var n = 0;
      mapChildren(children, function () {
        n++; // Don't return anything
      });
      return n;
    }
    /**
     * Iterates through children that are typically specified as `props.children`.
     *
     * See https://reactjs.org/docs/react-api.html#reactchildrenforeach
     *
     * The provided forEachFunc(child, index) will be called for each
     * leaf child.
     *
     * @param {?*} children Children tree container.
     * @param {function(*, int)} forEachFunc
     * @param {*} forEachContext Context for forEachContext.
     */


    function forEachChildren(children, forEachFunc, forEachContext) {
      mapChildren(children, function () {
        forEachFunc.apply(this, arguments); // Don't return anything.
      }, forEachContext);
    }
    /**
     * Flatten a children object (typically specified as `props.children`) and
     * return an array with appropriately re-keyed children.
     *
     * See https://reactjs.org/docs/react-api.html#reactchildrentoarray
     */


    function toArray(children) {
      return mapChildren(children, function (child) {
        return child;
      }) || [];
    }
    /**
     * Returns the first child in a collection of children and verifies that there
     * is only one child in the collection.
     *
     * See https://reactjs.org/docs/react-api.html#reactchildrenonly
     *
     * The current implementation of this function assumes that a single child gets
     * passed without a wrapper, but the purpose of this helper function is to
     * abstract away the particular structure of children.
     *
     * @param {?object} children Child collection structure.
     * @return {ReactElement} The first and only `ReactElement` contained in the
     * structure.
     */


    function onlyChild(children) {
      if (!isValidElement(children)) {
        {
          throw Error("React.Children.only expected to receive a single React element child.");
        }
      }

      return children;
    }

    function createContext(defaultValue, calculateChangedBits) {
      if (calculateChangedBits === undefined) {
        calculateChangedBits = null;
      } else {
        {
          if (calculateChangedBits !== null && typeof calculateChangedBits !== 'function') {
            error('createContext: Expected the optional second argument to be a ' + 'function. Instead received: %s', calculateChangedBits);
          }
        }
      }

      var context = {
        $$typeof: REACT_CONTEXT_TYPE,
        _calculateChangedBits: calculateChangedBits,
        // As a workaround to support multiple concurrent renderers, we categorize
        // some renderers as primary and others as secondary. We only expect
        // there to be two concurrent renderers at most: React Native (primary) and
        // Fabric (secondary); React DOM (primary) and React ART (secondary).
        // Secondary renderers store their context values on separate fields.
        _currentValue: defaultValue,
        _currentValue2: defaultValue,
        // Used to track how many concurrent renderers this context currently
        // supports within in a single renderer. Such as parallel server rendering.
        _threadCount: 0,
        // These are circular
        Provider: null,
        Consumer: null
      };
      context.Provider = {
        $$typeof: REACT_PROVIDER_TYPE,
        _context: context
      };
      var hasWarnedAboutUsingNestedContextConsumers = false;
      var hasWarnedAboutUsingConsumerProvider = false;
      var hasWarnedAboutDisplayNameOnConsumer = false;
      {
        // A separate object, but proxies back to the original context object for
        // backwards compatibility. It has a different $$typeof, so we can properly
        // warn for the incorrect usage of Context as a Consumer.
        var Consumer = {
          $$typeof: REACT_CONTEXT_TYPE,
          _context: context,
          _calculateChangedBits: context._calculateChangedBits
        }; // $FlowFixMe: Flow complains about not setting a value, which is intentional here

        Object.defineProperties(Consumer, {
          Provider: {
            get: function get() {
              if (!hasWarnedAboutUsingConsumerProvider) {
                hasWarnedAboutUsingConsumerProvider = true;
                error('Rendering <Context.Consumer.Provider> is not supported and will be removed in ' + 'a future major release. Did you mean to render <Context.Provider> instead?');
              }

              return context.Provider;
            },
            set: function set(_Provider) {
              context.Provider = _Provider;
            }
          },
          _currentValue: {
            get: function get() {
              return context._currentValue;
            },
            set: function set(_currentValue) {
              context._currentValue = _currentValue;
            }
          },
          _currentValue2: {
            get: function get() {
              return context._currentValue2;
            },
            set: function set(_currentValue2) {
              context._currentValue2 = _currentValue2;
            }
          },
          _threadCount: {
            get: function get() {
              return context._threadCount;
            },
            set: function set(_threadCount) {
              context._threadCount = _threadCount;
            }
          },
          Consumer: {
            get: function get() {
              if (!hasWarnedAboutUsingNestedContextConsumers) {
                hasWarnedAboutUsingNestedContextConsumers = true;
                error('Rendering <Context.Consumer.Consumer> is not supported and will be removed in ' + 'a future major release. Did you mean to render <Context.Consumer> instead?');
              }

              return context.Consumer;
            }
          },
          displayName: {
            get: function get() {
              return context.displayName;
            },
            set: function set(displayName) {
              if (!hasWarnedAboutDisplayNameOnConsumer) {
                warn('Setting `displayName` on Context.Consumer has no effect. ' + "You should set it directly on the context with Context.displayName = '%s'.", displayName);
                hasWarnedAboutDisplayNameOnConsumer = true;
              }
            }
          }
        }); // $FlowFixMe: Flow complains about missing properties because it doesn't understand defineProperty

        context.Consumer = Consumer;
      }
      {
        context._currentRenderer = null;
        context._currentRenderer2 = null;
      }
      return context;
    }

    var Uninitialized = -1;
    var Pending = 0;
    var Resolved = 1;
    var Rejected = 2;

    function lazyInitializer(payload) {
      if (payload._status === Uninitialized) {
        var ctor = payload._result;
        var thenable = ctor(); // Transition to the next state.

        var pending = payload;
        pending._status = Pending;
        pending._result = thenable;
        thenable.then(function (moduleObject) {
          if (payload._status === Pending) {
            var defaultExport = moduleObject.default;
            {
              if (defaultExport === undefined) {
                error('lazy: Expected the result of a dynamic import() call. ' + 'Instead received: %s\n\nYour code should look like: \n  ' + // Break up imports to avoid accidentally parsing them as dependencies.
                'const MyComponent = lazy(() => imp' + "ort('./MyComponent'))", moduleObject);
              }
            } // Transition to the next state.

            var resolved = payload;
            resolved._status = Resolved;
            resolved._result = defaultExport;
          }
        }, function (error) {
          if (payload._status === Pending) {
            // Transition to the next state.
            var rejected = payload;
            rejected._status = Rejected;
            rejected._result = error;
          }
        });
      }

      if (payload._status === Resolved) {
        return payload._result;
      } else {
        throw payload._result;
      }
    }

    function lazy(ctor) {
      var payload = {
        // We use these fields to store the result.
        _status: -1,
        _result: ctor
      };
      var lazyType = {
        $$typeof: REACT_LAZY_TYPE,
        _payload: payload,
        _init: lazyInitializer
      };
      {
        // In production, this would just set it on the object.
        var defaultProps;
        var propTypes; // $FlowFixMe

        Object.defineProperties(lazyType, {
          defaultProps: {
            configurable: true,
            get: function get() {
              return defaultProps;
            },
            set: function set(newDefaultProps) {
              error('React.lazy(...): It is not supported to assign `defaultProps` to ' + 'a lazy component import. Either specify them where the component ' + 'is defined, or create a wrapping component around it.');
              defaultProps = newDefaultProps; // Match production behavior more closely:
              // $FlowFixMe

              Object.defineProperty(lazyType, 'defaultProps', {
                enumerable: true
              });
            }
          },
          propTypes: {
            configurable: true,
            get: function get() {
              return propTypes;
            },
            set: function set(newPropTypes) {
              error('React.lazy(...): It is not supported to assign `propTypes` to ' + 'a lazy component import. Either specify them where the component ' + 'is defined, or create a wrapping component around it.');
              propTypes = newPropTypes; // Match production behavior more closely:
              // $FlowFixMe

              Object.defineProperty(lazyType, 'propTypes', {
                enumerable: true
              });
            }
          }
        });
      }
      return lazyType;
    }

    function forwardRef(render) {
      {
        if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
          error('forwardRef requires a render function but received a `memo` ' + 'component. Instead of forwardRef(memo(...)), use ' + 'memo(forwardRef(...)).');
        } else if (typeof render !== 'function') {
          error('forwardRef requires a render function but was given %s.', render === null ? 'null' : typeof render);
        } else {
          if (render.length !== 0 && render.length !== 2) {
            error('forwardRef render functions accept exactly two parameters: props and ref. %s', render.length === 1 ? 'Did you forget to use the ref parameter?' : 'Any additional parameter will be undefined.');
          }
        }

        if (render != null) {
          if (render.defaultProps != null || render.propTypes != null) {
            error('forwardRef render functions do not support propTypes or defaultProps. ' + 'Did you accidentally pass a React component?');
          }
        }
      }
      var elementType = {
        $$typeof: REACT_FORWARD_REF_TYPE,
        render: render
      };
      {
        var ownName;
        Object.defineProperty(elementType, 'displayName', {
          enumerable: false,
          configurable: true,
          get: function get() {
            return ownName;
          },
          set: function set(name) {
            ownName = name;

            if (render.displayName == null) {
              render.displayName = name;
            }
          }
        });
      }
      return elementType;
    } // Filter certain DOM attributes (e.g. src, href) if their values are empty strings.


    var enableScopeAPI = false; // Experimental Create Event Handle API.

    function isValidElementType(type) {
      if (typeof type === 'string' || typeof type === 'function') {
        return true;
      } // Note: typeof might be other than 'symbol' or 'number' (e.g. if it's a polyfill).


      if (type === exports.Fragment || type === exports.Profiler || type === REACT_DEBUG_TRACING_MODE_TYPE || type === exports.StrictMode || type === exports.Suspense || type === REACT_SUSPENSE_LIST_TYPE || type === REACT_LEGACY_HIDDEN_TYPE || enableScopeAPI) {
        return true;
      }

      if (typeof type === 'object' && type !== null) {
        if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_FUNDAMENTAL_TYPE || type.$$typeof === REACT_BLOCK_TYPE || type[0] === REACT_SERVER_BLOCK_TYPE) {
          return true;
        }
      }

      return false;
    }

    function memo(type, compare) {
      {
        if (!isValidElementType(type)) {
          error('memo: The first argument must be a component. Instead ' + 'received: %s', type === null ? 'null' : typeof type);
        }
      }
      var elementType = {
        $$typeof: REACT_MEMO_TYPE,
        type: type,
        compare: compare === undefined ? null : compare
      };
      {
        var ownName;
        Object.defineProperty(elementType, 'displayName', {
          enumerable: false,
          configurable: true,
          get: function get() {
            return ownName;
          },
          set: function set(name) {
            ownName = name;

            if (type.displayName == null) {
              type.displayName = name;
            }
          }
        });
      }
      return elementType;
    }

    function resolveDispatcher() {
      var dispatcher = ReactCurrentDispatcher.current;

      if (!(dispatcher !== null)) {
        {
          throw Error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
        }
      }

      return dispatcher;
    }

    function useContext(Context, unstable_observedBits) {
      var dispatcher = resolveDispatcher();
      {
        if (unstable_observedBits !== undefined) {
          error('useContext() second argument is reserved for future ' + 'use in React. Passing it is not supported. ' + 'You passed: %s.%s', unstable_observedBits, typeof unstable_observedBits === 'number' && Array.isArray(arguments[2]) ? '\n\nDid you call array.map(useContext)? ' + 'Calling Hooks inside a loop is not supported. ' + 'Learn more at https://reactjs.org/link/rules-of-hooks' : '');
        } // TODO: add a more generic warning for invalid values.


        if (Context._context !== undefined) {
          var realContext = Context._context; // Don't deduplicate because this legitimately causes bugs
          // and nobody should be using this in existing code.

          if (realContext.Consumer === Context) {
            error('Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be ' + 'removed in a future major release. Did you mean to call useContext(Context) instead?');
          } else if (realContext.Provider === Context) {
            error('Calling useContext(Context.Provider) is not supported. ' + 'Did you mean to call useContext(Context) instead?');
          }
        }
      }
      return dispatcher.useContext(Context, unstable_observedBits);
    }

    function useState(initialState) {
      var dispatcher = resolveDispatcher();
      return dispatcher.useState(initialState);
    }

    function useReducer(reducer, initialArg, init) {
      var dispatcher = resolveDispatcher();
      return dispatcher.useReducer(reducer, initialArg, init);
    }

    function useRef(initialValue) {
      var dispatcher = resolveDispatcher();
      return dispatcher.useRef(initialValue);
    }

    function useEffect(create, deps) {
      var dispatcher = resolveDispatcher();
      return dispatcher.useEffect(create, deps);
    }

    function useLayoutEffect(create, deps) {
      var dispatcher = resolveDispatcher();
      return dispatcher.useLayoutEffect(create, deps);
    }

    function useCallback(callback, deps) {
      var dispatcher = resolveDispatcher();
      return dispatcher.useCallback(callback, deps);
    }

    function useMemo(create, deps) {
      var dispatcher = resolveDispatcher();
      return dispatcher.useMemo(create, deps);
    }

    function useImperativeHandle(ref, create, deps) {
      var dispatcher = resolveDispatcher();
      return dispatcher.useImperativeHandle(ref, create, deps);
    }

    function useDebugValue(value, formatterFn) {
      {
        var dispatcher = resolveDispatcher();
        return dispatcher.useDebugValue(value, formatterFn);
      }
    } // Helpers to patch console.logs to avoid logging during side-effect free
    // replaying on render function. This currently only patches the object
    // lazily which won't cover if the log function was extracted eagerly.
    // We could also eagerly patch the method.


    var disabledDepth = 0;
    var prevLog;
    var prevInfo;
    var prevWarn;
    var prevError;
    var prevGroup;
    var prevGroupCollapsed;
    var prevGroupEnd;

    function disabledLog() {}

    disabledLog.__reactDisabledLog = true;

    function disableLogs() {
      {
        if (disabledDepth === 0) {
          /* eslint-disable react-internal/no-production-logging */
          prevLog = console.log;
          prevInfo = console.info;
          prevWarn = console.warn;
          prevError = console.error;
          prevGroup = console.group;
          prevGroupCollapsed = console.groupCollapsed;
          prevGroupEnd = console.groupEnd; // https://github.com/facebook/react/issues/19099

          var props = {
            configurable: true,
            enumerable: true,
            value: disabledLog,
            writable: true
          }; // $FlowFixMe Flow thinks console is immutable.

          Object.defineProperties(console, {
            info: props,
            log: props,
            warn: props,
            error: props,
            group: props,
            groupCollapsed: props,
            groupEnd: props
          });
          /* eslint-enable react-internal/no-production-logging */
        }

        disabledDepth++;
      }
    }

    function reenableLogs() {
      {
        disabledDepth--;

        if (disabledDepth === 0) {
          /* eslint-disable react-internal/no-production-logging */
          var props = {
            configurable: true,
            enumerable: true,
            writable: true
          }; // $FlowFixMe Flow thinks console is immutable.

          Object.defineProperties(console, {
            log: _assign({}, props, {
              value: prevLog
            }),
            info: _assign({}, props, {
              value: prevInfo
            }),
            warn: _assign({}, props, {
              value: prevWarn
            }),
            error: _assign({}, props, {
              value: prevError
            }),
            group: _assign({}, props, {
              value: prevGroup
            }),
            groupCollapsed: _assign({}, props, {
              value: prevGroupCollapsed
            }),
            groupEnd: _assign({}, props, {
              value: prevGroupEnd
            })
          });
          /* eslint-enable react-internal/no-production-logging */
        }

        if (disabledDepth < 0) {
          error('disabledDepth fell below zero. ' + 'This is a bug in React. Please file an issue.');
        }
      }
    }

    var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
    var prefix;

    function describeBuiltInComponentFrame(name, source, ownerFn) {
      {
        if (prefix === undefined) {
          // Extract the VM specific prefix used by each line.
          try {
            throw Error();
          } catch (x) {
            var match = x.stack.trim().match(/\n( *(at )?)/);
            prefix = match && match[1] || '';
          }
        } // We use the prefix to ensure our stacks line up with native stack frames.


        return '\n' + prefix + name;
      }
    }

    var reentry = false;
    var componentFrameCache;
    {
      var PossiblyWeakMap = typeof WeakMap === 'function' ? WeakMap : Map;
      componentFrameCache = new PossiblyWeakMap();
    }

    function describeNativeComponentFrame(fn, construct) {
      // If something asked for a stack inside a fake render, it should get ignored.
      if (!fn || reentry) {
        return '';
      }

      {
        var frame = componentFrameCache.get(fn);

        if (frame !== undefined) {
          return frame;
        }
      }
      var control;
      reentry = true;
      var previousPrepareStackTrace = Error.prepareStackTrace; // $FlowFixMe It does accept undefined.

      Error.prepareStackTrace = undefined;
      var previousDispatcher;
      {
        previousDispatcher = ReactCurrentDispatcher$1.current; // Set the dispatcher in DEV because this might be call in the render function
        // for warnings.

        ReactCurrentDispatcher$1.current = null;
        disableLogs();
      }

      try {
        // This should throw.
        if (construct) {
          // Something should be setting the props in the constructor.
          var Fake = function Fake() {
            throw Error();
          }; // $FlowFixMe


          Object.defineProperty(Fake.prototype, 'props', {
            set: function set() {
              // We use a throwing setter instead of frozen or non-writable props
              // because that won't throw in a non-strict mode function.
              throw Error();
            }
          });

          if (typeof Reflect === 'object' && Reflect.construct) {
            // We construct a different control for this case to include any extra
            // frames added by the construct call.
            try {
              Reflect.construct(Fake, []);
            } catch (x) {
              control = x;
            }

            Reflect.construct(fn, [], Fake);
          } else {
            try {
              Fake.call();
            } catch (x) {
              control = x;
            }

            fn.call(Fake.prototype);
          }
        } else {
          try {
            throw Error();
          } catch (x) {
            control = x;
          }

          fn();
        }
      } catch (sample) {
        // This is inlined manually because closure doesn't do it for us.
        if (sample && control && typeof sample.stack === 'string') {
          // This extracts the first frame from the sample that isn't also in the control.
          // Skipping one frame that we assume is the frame that calls the two.
          var sampleLines = sample.stack.split('\n');
          var controlLines = control.stack.split('\n');
          var s = sampleLines.length - 1;
          var c = controlLines.length - 1;

          while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
            // We expect at least one stack frame to be shared.
            // Typically this will be the root most one. However, stack frames may be
            // cut off due to maximum stack limits. In this case, one maybe cut off
            // earlier than the other. We assume that the sample is longer or the same
            // and there for cut off earlier. So we should find the root most frame in
            // the sample somewhere in the control.
            c--;
          }

          for (; s >= 1 && c >= 0; s--, c--) {
            // Next we find the first one that isn't the same which should be the
            // frame that called our sample function and the control.
            if (sampleLines[s] !== controlLines[c]) {
              // In V8, the first line is describing the message but other VMs don't.
              // If we're about to return the first line, and the control is also on the same
              // line, that's a pretty good indicator that our sample threw at same line as
              // the control. I.e. before we entered the sample frame. So we ignore this result.
              // This can happen if you passed a class to function component, or non-function.
              if (s !== 1 || c !== 1) {
                do {
                  s--;
                  c--; // We may still have similar intermediate frames from the construct call.
                  // The next one that isn't the same should be our match though.

                  if (c < 0 || sampleLines[s] !== controlLines[c]) {
                    // V8 adds a "new" prefix for native classes. Let's remove it to make it prettier.
                    var _frame = '\n' + sampleLines[s].replace(' at new ', ' at ');

                    {
                      if (typeof fn === 'function') {
                        componentFrameCache.set(fn, _frame);
                      }
                    } // Return the line we found.

                    return _frame;
                  }
                } while (s >= 1 && c >= 0);
              }

              break;
            }
          }
        }
      } finally {
        reentry = false;
        {
          ReactCurrentDispatcher$1.current = previousDispatcher;
          reenableLogs();
        }
        Error.prepareStackTrace = previousPrepareStackTrace;
      } // Fallback to just using the name if we couldn't make it throw.


      var name = fn ? fn.displayName || fn.name : '';
      var syntheticFrame = name ? describeBuiltInComponentFrame(name) : '';
      {
        if (typeof fn === 'function') {
          componentFrameCache.set(fn, syntheticFrame);
        }
      }
      return syntheticFrame;
    }

    function describeFunctionComponentFrame(fn, source, ownerFn) {
      {
        return describeNativeComponentFrame(fn, false);
      }
    }

    function shouldConstruct(Component) {
      var prototype = Component.prototype;
      return !!(prototype && prototype.isReactComponent);
    }

    function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
      if (type == null) {
        return '';
      }

      if (typeof type === 'function') {
        {
          return describeNativeComponentFrame(type, shouldConstruct(type));
        }
      }

      if (typeof type === 'string') {
        return describeBuiltInComponentFrame(type);
      }

      switch (type) {
        case exports.Suspense:
          return describeBuiltInComponentFrame('Suspense');

        case REACT_SUSPENSE_LIST_TYPE:
          return describeBuiltInComponentFrame('SuspenseList');
      }

      if (typeof type === 'object') {
        switch (type.$$typeof) {
          case REACT_FORWARD_REF_TYPE:
            return describeFunctionComponentFrame(type.render);

          case REACT_MEMO_TYPE:
            // Memo may contain any component type so we recursively resolve it.
            return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);

          case REACT_BLOCK_TYPE:
            return describeFunctionComponentFrame(type._render);

          case REACT_LAZY_TYPE:
            {
              var lazyComponent = type;
              var payload = lazyComponent._payload;
              var init = lazyComponent._init;

              try {
                // Lazy may contain any component type so we recursively resolve it.
                return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
              } catch (x) {}
            }
        }
      }

      return '';
    }

    var loggedTypeFailures = {};
    var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;

    function setCurrentlyValidatingElement(element) {
      {
        if (element) {
          var owner = element._owner;
          var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
          ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
        } else {
          ReactDebugCurrentFrame$1.setExtraStackFrame(null);
        }
      }
    }

    function checkPropTypes(typeSpecs, values, location, componentName, element) {
      {
        // $FlowFixMe This is okay but Flow doesn't know it.
        var has = Function.call.bind(Object.prototype.hasOwnProperty);

        for (var typeSpecName in typeSpecs) {
          if (has(typeSpecs, typeSpecName)) {
            var error$1 = void 0; // Prop type validation may throw. In case they do, we don't want to
            // fail the render phase where it didn't fail before. So we log it.
            // After these have been cleaned up, we'll let them throw.

            try {
              // This is intentionally an invariant that gets caught. It's the same
              // behavior as without this statement except with a better message.
              if (typeof typeSpecs[typeSpecName] !== 'function') {
                var err = Error((componentName || 'React class') + ': ' + location + ' type `' + typeSpecName + '` is invalid; ' + 'it must be a function, usually from the `prop-types` package, but received `' + typeof typeSpecs[typeSpecName] + '`.' + 'This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.');
                err.name = 'Invariant Violation';
                throw err;
              }

              error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
            } catch (ex) {
              error$1 = ex;
            }

            if (error$1 && !(error$1 instanceof Error)) {
              setCurrentlyValidatingElement(element);
              error('%s: type specification of %s' + ' `%s` is invalid; the type checker ' + 'function must return `null` or an `Error` but returned a %s. ' + 'You may have forgotten to pass an argument to the type checker ' + 'creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and ' + 'shape all require an argument).', componentName || 'React class', location, typeSpecName, typeof error$1);
              setCurrentlyValidatingElement(null);
            }

            if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
              // Only monitor this failure once because there tends to be a lot of the
              // same error.
              loggedTypeFailures[error$1.message] = true;
              setCurrentlyValidatingElement(element);
              error('Failed %s type: %s', location, error$1.message);
              setCurrentlyValidatingElement(null);
            }
          }
        }
      }
    }

    function setCurrentlyValidatingElement$1(element) {
      {
        if (element) {
          var owner = element._owner;
          var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
          setExtraStackFrame(stack);
        } else {
          setExtraStackFrame(null);
        }
      }
    }

    var propTypesMisspellWarningShown;
    {
      propTypesMisspellWarningShown = false;
    }

    function getDeclarationErrorAddendum() {
      if (ReactCurrentOwner.current) {
        var name = getComponentName(ReactCurrentOwner.current.type);

        if (name) {
          return '\n\nCheck the render method of `' + name + '`.';
        }
      }

      return '';
    }

    function getSourceInfoErrorAddendum(source) {
      if (source !== undefined) {
        var fileName = source.fileName.replace(/^.*[\\\/]/, '');
        var lineNumber = source.lineNumber;
        return '\n\nCheck your code at ' + fileName + ':' + lineNumber + '.';
      }

      return '';
    }

    function getSourceInfoErrorAddendumForProps(elementProps) {
      if (elementProps !== null && elementProps !== undefined) {
        return getSourceInfoErrorAddendum(elementProps.__source);
      }

      return '';
    }
    /**
     * Warn if there's no key explicitly set on dynamic arrays of children or
     * object keys are not valid. This allows us to keep track of children between
     * updates.
     */


    var ownerHasKeyUseWarning = {};

    function getCurrentComponentErrorInfo(parentType) {
      var info = getDeclarationErrorAddendum();

      if (!info) {
        var parentName = typeof parentType === 'string' ? parentType : parentType.displayName || parentType.name;

        if (parentName) {
          info = "\n\nCheck the top-level render call using <" + parentName + ">.";
        }
      }

      return info;
    }
    /**
     * Warn if the element doesn't have an explicit key assigned to it.
     * This element is in an array. The array could grow and shrink or be
     * reordered. All children that haven't already been validated are required to
     * have a "key" property assigned to it. Error statuses are cached so a warning
     * will only be shown once.
     *
     * @internal
     * @param {ReactElement} element Element that requires a key.
     * @param {*} parentType element's parent's type.
     */


    function validateExplicitKey(element, parentType) {
      if (!element._store || element._store.validated || element.key != null) {
        return;
      }

      element._store.validated = true;
      var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);

      if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
        return;
      }

      ownerHasKeyUseWarning[currentComponentErrorInfo] = true; // Usually the current owner is the offender, but if it accepts children as a
      // property, it may be the creator of the child that's responsible for
      // assigning it a key.

      var childOwner = '';

      if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
        // Give the component that originally created this child.
        childOwner = " It was passed a child from " + getComponentName(element._owner.type) + ".";
      }

      {
        setCurrentlyValidatingElement$1(element);
        error('Each child in a list should have a unique "key" prop.' + '%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
        setCurrentlyValidatingElement$1(null);
      }
    }
    /**
     * Ensure that every element either is passed in a static location, in an
     * array with an explicit keys property defined, or in an object literal
     * with valid key property.
     *
     * @internal
     * @param {ReactNode} node Statically passed child of any type.
     * @param {*} parentType node's parent's type.
     */


    function validateChildKeys(node, parentType) {
      if (typeof node !== 'object') {
        return;
      }

      if (Array.isArray(node)) {
        for (var i = 0; i < node.length; i++) {
          var child = node[i];

          if (isValidElement(child)) {
            validateExplicitKey(child, parentType);
          }
        }
      } else if (isValidElement(node)) {
        // This element was passed in a valid location.
        if (node._store) {
          node._store.validated = true;
        }
      } else if (node) {
        var iteratorFn = getIteratorFn(node);

        if (typeof iteratorFn === 'function') {
          // Entry iterators used to provide implicit keys,
          // but now we print a separate warning for them later.
          if (iteratorFn !== node.entries) {
            var iterator = iteratorFn.call(node);
            var step;

            while (!(step = iterator.next()).done) {
              if (isValidElement(step.value)) {
                validateExplicitKey(step.value, parentType);
              }
            }
          }
        }
      }
    }
    /**
     * Given an element, validate that its props follow the propTypes definition,
     * provided by the type.
     *
     * @param {ReactElement} element
     */


    function validatePropTypes(element) {
      {
        var type = element.type;

        if (type === null || type === undefined || typeof type === 'string') {
          return;
        }

        var propTypes;

        if (typeof type === 'function') {
          propTypes = type.propTypes;
        } else if (typeof type === 'object' && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
        // Inner props are checked in the reconciler.
        type.$$typeof === REACT_MEMO_TYPE)) {
          propTypes = type.propTypes;
        } else {
          return;
        }

        if (propTypes) {
          // Intentionally inside to avoid triggering lazy initializers:
          var name = getComponentName(type);
          checkPropTypes(propTypes, element.props, 'prop', name, element);
        } else if (type.PropTypes !== undefined && !propTypesMisspellWarningShown) {
          propTypesMisspellWarningShown = true; // Intentionally inside to avoid triggering lazy initializers:

          var _name = getComponentName(type);

          error('Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?', _name || 'Unknown');
        }

        if (typeof type.getDefaultProps === 'function' && !type.getDefaultProps.isReactClassApproved) {
          error('getDefaultProps is only used on classic React.createClass ' + 'definitions. Use a static property named `defaultProps` instead.');
        }
      }
    }
    /**
     * Given a fragment, validate that it can only be provided with fragment props
     * @param {ReactElement} fragment
     */


    function validateFragmentProps(fragment) {
      {
        var keys = Object.keys(fragment.props);

        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];

          if (key !== 'children' && key !== 'key') {
            setCurrentlyValidatingElement$1(fragment);
            error('Invalid prop `%s` supplied to `React.Fragment`. ' + 'React.Fragment can only have `key` and `children` props.', key);
            setCurrentlyValidatingElement$1(null);
            break;
          }
        }

        if (fragment.ref !== null) {
          setCurrentlyValidatingElement$1(fragment);
          error('Invalid attribute `ref` supplied to `React.Fragment`.');
          setCurrentlyValidatingElement$1(null);
        }
      }
    }

    function createElementWithValidation(type, props, children) {
      var validType = isValidElementType(type); // We warn in this case but don't throw. We expect the element creation to
      // succeed and there will likely be errors in render.

      if (!validType) {
        var info = '';

        if (type === undefined || typeof type === 'object' && type !== null && Object.keys(type).length === 0) {
          info += ' You likely forgot to export your component from the file ' + "it's defined in, or you might have mixed up default and named imports.";
        }

        var sourceInfo = getSourceInfoErrorAddendumForProps(props);

        if (sourceInfo) {
          info += sourceInfo;
        } else {
          info += getDeclarationErrorAddendum();
        }

        var typeString;

        if (type === null) {
          typeString = 'null';
        } else if (Array.isArray(type)) {
          typeString = 'array';
        } else if (type !== undefined && type.$$typeof === REACT_ELEMENT_TYPE) {
          typeString = "<" + (getComponentName(type.type) || 'Unknown') + " />";
          info = ' Did you accidentally export a JSX literal instead of a component?';
        } else {
          typeString = typeof type;
        }

        {
          error('React.createElement: type is invalid -- expected a string (for ' + 'built-in components) or a class/function (for composite ' + 'components) but got: %s.%s', typeString, info);
        }
      }

      var element = createElement.apply(this, arguments); // The result can be nullish if a mock or a custom function is used.
      // TODO: Drop this when these are no longer allowed as the type argument.

      if (element == null) {
        return element;
      } // Skip key warning if the type isn't valid since our key validation logic
      // doesn't expect a non-string/function type and can throw confusing errors.
      // We don't want exception behavior to differ between dev and prod.
      // (Rendering will throw with a helpful message and as soon as the type is
      // fixed, the key warnings will appear.)


      if (validType) {
        for (var i = 2; i < arguments.length; i++) {
          validateChildKeys(arguments[i], type);
        }
      }

      if (type === exports.Fragment) {
        validateFragmentProps(element);
      } else {
        validatePropTypes(element);
      }

      return element;
    }

    var didWarnAboutDeprecatedCreateFactory = false;

    function createFactoryWithValidation(type) {
      var validatedFactory = createElementWithValidation.bind(null, type);
      validatedFactory.type = type;
      {
        if (!didWarnAboutDeprecatedCreateFactory) {
          didWarnAboutDeprecatedCreateFactory = true;
          warn('React.createFactory() is deprecated and will be removed in ' + 'a future major release. Consider using JSX ' + 'or use React.createElement() directly instead.');
        } // Legacy hook: remove it


        Object.defineProperty(validatedFactory, 'type', {
          enumerable: false,
          get: function get() {
            warn('Factory.type is deprecated. Access the class directly ' + 'before passing it to createFactory.');
            Object.defineProperty(this, 'type', {
              value: type
            });
            return type;
          }
        });
      }
      return validatedFactory;
    }

    function cloneElementWithValidation(element, props, children) {
      var newElement = cloneElement.apply(this, arguments);

      for (var i = 2; i < arguments.length; i++) {
        validateChildKeys(arguments[i], newElement.type);
      }

      validatePropTypes(newElement);
      return newElement;
    }

    {
      try {
        var frozenObject = Object.freeze({});
        /* eslint-disable no-new */

        new Map([[frozenObject, null]]);
        new Set([frozenObject]);
        /* eslint-enable no-new */
      } catch (e) {}
    }
    var createElement$1 = createElementWithValidation;
    var cloneElement$1 = cloneElementWithValidation;
    var createFactory = createFactoryWithValidation;
    var Children = {
      map: mapChildren,
      forEach: forEachChildren,
      count: countChildren,
      toArray: toArray,
      only: onlyChild
    };
    exports.Children = Children;
    exports.Component = Component;
    exports.PureComponent = PureComponent;
    exports.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
    exports.cloneElement = cloneElement$1;
    exports.createContext = createContext;
    exports.createElement = createElement$1;
    exports.createFactory = createFactory;
    exports.createRef = createRef;
    exports.forwardRef = forwardRef;
    exports.isValidElement = isValidElement;
    exports.lazy = lazy;
    exports.memo = memo;
    exports.useCallback = useCallback;
    exports.useContext = useContext;
    exports.useDebugValue = useDebugValue;
    exports.useEffect = useEffect;
    exports.useImperativeHandle = useImperativeHandle;
    exports.useLayoutEffect = useLayoutEffect;
    exports.useMemo = useMemo;
    exports.useReducer = useReducer;
    exports.useRef = useRef;
    exports.useState = useState;
    exports.version = ReactVersion;
  })();
}
}(react_development));

if (process.env.NODE_ENV === 'production') {
  react.exports = react_production_min;
} else {
  react.exports = react_development;
}

var React = react.exports;

var RouterStateContext = /*#__PURE__*/React.createContext({
  state: null,
  router: null
});
var RouterContext = /*#__PURE__*/React.createContext(null);

var RouterProvider = function RouterProvider(_ref) {
  var children = _ref.children,
      router = _ref.router;

  var _useState = react.exports.useState({
    state: router.state
  }),
      state = _useState[0],
      setState = _useState[1];

  react.exports.useLayoutEffect(function () {
    var removeListner = router.addEventListener(events.TRANSITION_SUCCESS, function (_ref2) {
      var toState = _ref2.toState;
      setState({
        state: toState
      });
    });
    return removeListner;
  }, [router]);
  return /*#__PURE__*/React.createElement(RouterContext.Provider, {
    value: router
  }, /*#__PURE__*/React.createElement(RouterStateContext.Provider, {
    value: {
      router: router,
      state: state.state
    }
  }, children));
};

function _assertThisInitialized(self) {
  if (self === void 0) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return self;
}

var _excluded$3 = ["children", "activeClassName", "className", "name", "params", "ignoreQueryParams", "exact", "activeOn"];

var Link = /*#__PURE__*/function (_Component) {
  _inheritsLoose(Link, _Component);

  function Link(props) {
    var _this;

    _this = _Component.call(this, props) || this;
    _this.buildUrl = void 0;
    _this.clickHandler = _this.clickHandler.bind(_assertThisInitialized(_this));

    var urlCache = function urlCache() {
      var url = undefined;
      var _name = undefined;
      var _params = undefined;
      return function (name, params) {
        if (name !== _name || _params !== params) {
          var _this$context$router;

          url = (_this$context$router = _this.context.router) == null ? void 0 : _this$context$router.buildPath(name, params);
          _name = name;
          _params = params;
        }

        return url;
      };
    };

    _this.buildUrl = urlCache();
    return _this;
  }

  var _proto = Link.prototype;

  _proto.clickHandler = function clickHandler(evt) {
    var _this$props = this.props,
        onClick = _this$props.onClick,
        target = _this$props.target;
    var _this$props2 = this.props,
        name = _this$props2.name,
        params = _this$props2.params,
        options = _this$props2.options;
    var router = this.context.router;

    if (onClick) {
      onClick(evt);

      if (evt.defaultPrevented) {
        return;
      }
    }

    var comboKey = evt.metaKey || evt.altKey || evt.ctrlKey || evt.shiftKey;

    if (evt.button === 0 && !comboKey && target !== '_blank') {
      evt.preventDefault();
      router == null ? void 0 : router.navigate(name, params || {}, options);
    }
  };

  _proto.render = function render() {
    var _this$props3 = this.props,
        children = _this$props3.children,
        activeClassName = _this$props3.activeClassName,
        className = _this$props3.className,
        name = _this$props3.name,
        params = _this$props3.params,
        ignoreQueryParams = _this$props3.ignoreQueryParams,
        exact = _this$props3.exact,
        activeOn = _this$props3.activeOn,
        props = _objectWithoutPropertiesLoose(_this$props3, _excluded$3);

    var router = this.context.router;
    var active = (router == null ? void 0 : router.isActive(activeOn || name, params, exact, ignoreQueryParams)) || false;
    var linkclassName = (active ? [activeClassName] : []).concat(className ? className.split(' ') : []).join(' ');
    var href = this.buildUrl(name, params);
    return /*#__PURE__*/React.createElement("a", _extends({
      className: linkclassName,
      href: href,
      onClick: this.clickHandler
    }, props), children);
  };

  return Link;
}(react.exports.Component);

Link.contextType = RouterStateContext;
Link.defaultProps = {
  activeClassName: 'active',
  ignoreQueryParams: true,
  exact: false
};

function _createForOfIteratorHelperLoose$1(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$1(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray$1(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$1(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen); }

function _arrayLikeToArray$1(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

/**
 * is node with given name active?
 * @param name - looking for this name
 * @param names - list of known node names
 * @returns
 */
var isNodeActive = function isNodeActive(name, names) {
  if (name.indexOf('*') === -1) {
    return names.indexOf(name) !== -1;
  }

  var compareTo = name.split('.');

  var _loop = function _loop() {
    var treeName = _step.value;
    var compareWith = treeName.split('.');
    var active = compareTo.every(function (part, index) {
      if (part === '*' && compareWith[index] !== undefined) {
        return true;
      }

      return part === compareWith[index];
    });
    if (active) return {
      v: true
    };
  };

  for (var _iterator = _createForOfIteratorHelperLoose$1(names), _step; !(_step = _iterator()).done;) {
    var _ret = _loop();

    if (typeof _ret === "object") return _ret.v;
  }

  return false;
};

var useRouterState = function useRouterState() {
  return react.exports.useContext(RouterStateContext);
};

function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
/**
 *
 * @param param0
 * @returns
 */

var Route = function Route(_ref) {
  var children = _ref.children,
      name = _ref.name;
  var r = useRouterState();
  var active = false;

  if (r.state) {
    for (var _iterator = _createForOfIteratorHelperLoose(r.state.activeNodes), _step; !(_step = _iterator()).done;) {
      var node = _step.value;
      active = isNodeActive(name, node.treeNames);
      if (active) break;
    }
  }

  return react.exports.useMemo(function () {
    return active && children ? /*#__PURE__*/React.createElement(React.Fragment, null, children) : null;
  }, [active, children]);
};

var useRouteNode = function useRouteNode(nodeName) {
  var router = react.exports.useContext(RouterContext);
  var node = router == null ? void 0 : router.rootNode.getNodeByName(nodeName);

  var _useState = react.exports.useState({
    id: 0
  }),
      setState = _useState[1];

  react.exports.useLayoutEffect(function () {
    var removeListner = router.addEventListener(events.ROUTER_RELOAD_NODE, function (_ref) {
      var name = _ref.name;

      if (name === nodeName) {
        setState(function (s) {
          return {
            id: s.id += 1
          };
        });
      }
    });
    return removeListner;
  }, [router, nodeName]);
  return node;
};

var _excluded$2 = ["forwardedRef"];
var withNode = function withNode(nodeName) {
  return function (Component) {
    var displayName = Component.displayName || Component.name || 'Component';

    var ComponentWithNode = function ComponentWithNode(props) {
      var forwardedRef = props.forwardedRef,
          rest = _objectWithoutPropertiesLoose(props, _excluded$2);

      var node = useRouteNode(nodeName);
      return /*#__PURE__*/React.createElement(Component, _extends({
        node: node,
        ref: forwardedRef
      }, rest));
    };

    ComponentWithNode.displayName = "withNode(" + displayName + ")";

    function forwardFunction(props, ref) {
      return /*#__PURE__*/React.createElement(ComponentWithNode, _extends({
        forwardedRef: ref
      }, props));
    }

    forwardFunction.displayName = "forwardRef(withNode(" + displayName + "))";
    return /*#__PURE__*/react.exports.forwardRef(forwardFunction);
  };
};

var useRouter = function useRouter() {
  return react.exports.useContext(RouterContext);
};

var _excluded$1 = ["forwardedRef"];
var withRouter = function withRouter(Component) {
  var displayName = Component.displayName || Component.name || 'Component';

  var ComponentWithNode = function ComponentWithNode(props) {
    var forwardedRef = props.forwardedRef,
        rest = _objectWithoutPropertiesLoose(props, _excluded$1);

    var router = useRouter();
    return /*#__PURE__*/React.createElement(Component, _extends({
      router: router,
      ref: forwardedRef
    }, rest));
  };

  ComponentWithNode.displayName = "withRouter(" + displayName + ")";

  function forwardFunction(props, ref) {
    return /*#__PURE__*/React.createElement(ComponentWithNode, _extends({
      forwardedRef: ref
    }, props));
  }

  forwardFunction.displayName = "forwardRef(withRouter(" + displayName + "))";
  return /*#__PURE__*/react.exports.forwardRef(forwardFunction);
};

var _excluded = ["forwardedRef"];
var withRouterState = function withRouterState(Component) {
  var displayName = Component.displayName || Component.name || 'Component';

  var ComponentWithNode = function ComponentWithNode(props) {
    var forwardedRef = props.forwardedRef,
        rest = _objectWithoutPropertiesLoose(props, _excluded);

    var _useRouterState = useRouterState(),
        router = _useRouterState.router,
        state = _useRouterState.state;

    return /*#__PURE__*/React.createElement(Component, _extends({
      router: router,
      state: state,
      ref: forwardedRef
    }, rest));
  };

  ComponentWithNode.displayName = "withRouterState(" + displayName + ")";

  function forwardFunction(props, ref) {
    return /*#__PURE__*/React.createElement(ComponentWithNode, _extends({
      forwardedRef: ref
    }, props));
  }

  forwardFunction.displayName = "forwardRef(withRouterState(" + displayName + "))";
  return /*#__PURE__*/react.exports.forwardRef(forwardFunction);
};

export { BrowserHistory, Link, NavigationError, Node, Redirect, Route, RouteNode, Router42, RouterContext, RouterError, RouterProvider, RouterStateContext, createNode, errorCodes, events, useRouteNode, useRouter, useRouterState, withNode, withRouter, withRouterState };
//# sourceMappingURL=index.es.js.map
