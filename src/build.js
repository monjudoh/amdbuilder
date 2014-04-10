
module.exports = function build(options,callback) {
  var deepcopy = require('deepcopy');
  var path = require('path');
  var fs = require('fs');
  var _ = require('underscore');
  var temp = require('temp');
  temp.track();
  function noop(){}
  options = _.defaults(deepcopy(options || {}),{
  });
  callback = callback || noop;
  var config = (function () {

    var config = _.defaults(deepcopy(options.requireConfig || Object.create(null)),{
      dir:temp.mkdirSync('build_'+options.moduleName.replace(/\//g,'_')),
      modules : [
        {
          name: options.moduleName
        }
      ],
      paths:{},
      optimize:'none'
    });
    options.exclude.forEach(function(dep){
      config.paths[dep] = 'empty:';
    });
    return config;
  })();
  var escodegenOptions = {
    format: {
      indent:{
        style:'  ',
        adjustMultilineComment: true
      }
    },
    comment:true
  };
  var amdcleanOptions = {
    escodegen:escodegenOptions,
    wrap: {
      start: _.template(fs.readFileSync(path.resolve(__dirname,'../templates/start.amd.template')).toString())({
        deps:options.exclude,
        moduleName:options.moduleName,
        before:options.startBefore,
        after:options.startAfter
      }),
      end: _.template(fs.readFileSync(path.resolve(__dirname,'../templates/end.amd.template')).toString())({
        deps:options.exclude,
        moduleName:options.moduleName,
        before:options.endBefore,
        after:options.endAfter
      })
    }
  };
  var distDir = options.distDir || temp.mkdirSync('distDir_'+options.moduleName.replace(/\//g,'_'));
  var requirejs = require('requirejs');
  var amdclean = require('amdclean');
  requirejs.optimize(config, function (buildResponse) {
    config.modules.forEach((function (amdcleanOptions,module) {
      var name = config.paths[module.name] || module.name;
      var fromPath = path.join(config.dir, (name + '.js'));
      amdcleanOptions.code = fs.readFileSync(fromPath).toString();
      var code = (function (code) {
        var esprima = require('esprima');
        var escodegen = require('escodegen');
        var ast = esprima.parse(code,{
          comment: true,
          range: true,
          tokens: true
        });
        escodegen.attachComments(ast, ast.comments, ast.tokens);
        return escodegen.generate(ast,escodegenOptions);
      })(amdclean.clean(amdcleanOptions));
      var toName = options.toName || module.name;
      var toExt = '.js';
      var toPath = path.resolve(distDir, (toName + toExt));
      require('./mkdirRecursive')(toPath);
      fs.writeFile(toPath, code, function (err) {
        if (err) {
          throw err
        }
        callback(toPath,code);
      });
    }).bind(null,deepcopy(amdcleanOptions)));
  }, function(err) {
    console.log(err);
  });
};