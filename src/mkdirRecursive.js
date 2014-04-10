module.exports = function mkdirRecursive(targetPath) {
  var path = require('path');
  var fs = require('fs');
  var notExistsDirs = [];
  var dir = path.dirname(targetPath);
  while(!fs.existsSync(dir)){
    notExistsDirs.unshift(dir);
    dir = path.dirname(dir);
  }
  notExistsDirs.forEach(function(dir){
    fs.mkdirSync(dir);
  });
};