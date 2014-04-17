var path = require('path');
var fs = require('fs');
var _ = require('underscore');
var grasp = require('grasp');
var search = grasp.search('squery');
function getAbsolutePath(config, moduleName){
  var relativePath = ((config.paths || {})[moduleName] || moduleName) + '.js';
  var absolutePath = path.resolve(config.baseUrl,relativePath);
  return absolutePath;
}
function getCode(config, moduleName){
  if (config.rawText && config.rawText[moduleName]) {
    return config.rawText[moduleName];
  }
  var absolutePath = getAbsolutePath(config, moduleName);
  var code = fs.readFileSync(absolutePath).toString();
  return code;
}
function getExclude(config, moduleName,rule){
  var code = getCode(config, moduleName);
  var modules = search('call[callee=#define]>arr>*',code).filter(function(node){
    return node.type === 'Literal' && typeof node.value === 'string';
  }).map(function(node){
    return node.value;
  });
  var modules4include = modules.filter(rule).filter(function(moduleName){
    return moduleName !== 'module';
  });
  var exclude = _.unique(_.flatten([modules4include.map(function(moduleName){
    return getExclude(config,moduleName,rule);
  }), _.difference(modules,modules4include)]));
  return exclude;
}
module.exports = function findExclude(config,rule){
  return _.flatten(config.modules.map(function(module){
    return module.name;
  }).map(function(mainModuleName){
    return getExclude(config,mainModuleName,rule);
  }));
};