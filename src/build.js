
module.exports = function build(options,callback) {
  var deepcopy = require('deepcopy');
  var path = require('path');
  var fs = require('fs');
  var _ = require('underscore');
  var temp = require('temp');
  temp.track();
  function noop(){}
  options = _.defaults(deepcopy(options || {}),{
    templateType:'amd',
    prefixTransform:function(postNormalizedModuleName, preNormalizedModuleName) {
      return postNormalizedModuleName;
    }
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
    if (options.includeRule) {
      options.exclude = require('./findExclude')(config, options.includeRule);
    }
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
  var type2startTemplate = {
    amd:'start.amd.template',
    global:'start.global.template',
    cjs:'start.cjs.template'
  };
  var type2endTemplate = {
    amd:'end.amd.template',
    global:'end.global.template',
    cjs:'end.cjs.template'
  };
  var templateDir = path.resolve(__dirname,'../templates');
  function prefixTransform(name) {
    return (options.prefixTransform)(null,name);
  }
  var amdcleanOptions = Object.assign(Object.create(null),{
    escodegen:escodegenOptions,
    wrap: {
      start: _.template(fs.readFileSync(path.resolve(templateDir,type2startTemplate[options.templateType])).toString())({
        deps:options.exclude,
        prefixTransform:prefixTransform,
        moduleName:options.moduleName,
        before:options.startBefore,
        after:options.startAfter
      }),
      end: _.template(fs.readFileSync(path.resolve(templateDir,type2endTemplate[[options.templateType]])).toString())({
        deps:options.exclude,
        prefixTransform:prefixTransform,
        moduleName:options.moduleName,
        before:options.endBefore,
        after:options.endAfter
      })
    },
    prefixTransform:options.prefixTransform
  });
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