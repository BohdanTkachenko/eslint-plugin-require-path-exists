import fs from 'fs-plus';
import path from 'path';
import { execFileSync } from 'child_process';
import builtinModules from 'builtin-modules';
import resolve from 'resolve';

function getCurrentFilePath(context) {
  let filename = context.getFilename();
  if (!fs.isAbsolute(filename)) {
    filename = path.join(process.cwd(), filename);
  }

  return path.dirname(filename);
}

const webpackConfigCache = {};
function getWebpackConfig(fromDir) {
  const pathname = path.resolve(fromDir);
  if (webpackConfigCache[pathname]) {
    return webpackConfigCache[pathname];
  }

  if (!fs.existsSync(pathname)) {
    throw new Error(`Webpack config does not exists at ${pathname}.`);
  }

  const webpackConfigLoadCode = [
    'try {',
    `  var config = JSON.stringify(require('${pathname}'));`,
    '  console.log(config);',
    '} catch (e) {',
    `  console.log('{ "parseError": ' + JSON.stringify(e.message) + ' }');`,
    '}'
  ].join('');

  let result = execFileSync(process.argv[0], [ '-e', webpackConfigLoadCode ]);
  result = result.toString().trim();

  if (!result) {
    throw new Error(`Webpack config is empty at ${pathname}.`);
  }

  result = JSON.parse(result);
  if (result.parseError) {
    throw new Error(`Cannot load Webpack config: ${result.parseError}`);
  }

  webpackConfigCache[pathname] = result;

  return result;
}

function getWebpackAliases(webpackConfigPath) {
  const webpackConfig = getWebpackConfig(webpackConfigPath);

  let alias = {};
  if (typeof webpackConfig.resolve === 'object') {
    if (typeof webpackConfig.resolve.alias === 'object') {
      alias = webpackConfig.resolve.alias;
    }
  }

  return alias;
}

function testModulePath(value, fileDir, aliases = {}, extensions = []) {
  if (builtinModules.indexOf(value) >= 0) {
    return;
  }

  if (aliases[value] !== undefined) {
    value = aliases[value];
  } else {
    for (const key of Object.keys(aliases)) {
      if (value.startsWith(`${key}/`)) {
        value = value.replace(`${key}/`, `${aliases[key]}/`);
        break;
      }
    }
  }

  try {
    resolve.sync(value, {
      basedir: fileDir,
      extensions,
      paths: process.env.NODE_PATH
        ? [process.env.NODE_PATH]
        : undefined
    });
  } catch (e) {
    return e.message;
  }
}

function testRequirePath(fileName, node, context, config) {
  for (let value of fileName.split('!')) {
    const fileDir = getCurrentFilePath(context);
    if (!fileDir) {
      continue;
    }

    try {
      let result = testModulePath(value, fileDir, config.aliases, config.extensions);
      if (result) {
        context.report(node, result, {});
      }
    } catch (e) {
      context.report(node, `Unexpected error in eslint-plugin-require-path-exists: ${e.message}\n${e.stack}`, {});
    }
  }
}

export const exists = context => {
  let pluginSettings = {};
  if (context && context.options && typeof context.options[0] === 'object') {
    pluginSettings = context.options[0];
  }

  const config = {
    extensions: Array.isArray(pluginSettings.extensions) ? pluginSettings.extensions : [ '', '.js', '.json', '.node' ],
    webpackConfigPath: pluginSettings.webpackConfigPath === undefined ? null : pluginSettings.webpackConfigPath,
    aliases: {}
  };

  if (config.webpackConfigPath !== null) {
    config.aliases = getWebpackAliases(config.webpackConfigPath);
  }

  return {
    ImportDeclaration(node) {
      testRequirePath(node.source.value, node, context, config);
    },

    CallExpression(node) {
      if (node.callee.name !== 'require' || !node.arguments.length || typeof node.arguments[0].value !== 'string' || !node.arguments[0].value) {
        return;
      }

      testRequirePath(node.arguments[0].value, node, context, config);
    }
  };
};
