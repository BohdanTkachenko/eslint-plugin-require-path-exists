import fs from 'fs-plus';
import path from 'path';
import url from 'url';
import { execFileSync } from 'child_process';
import builtinModules from 'builtin-modules';

const PACKAGE_JSON_NAME = 'package.json';
const NODE_MODULES_DIR_NAME = 'node_modules';
const MAIN_FILE_NAME = 'index';
const MAIN_FILE_NAME_JS = 'index.js';

function findInParents(absolutePath, targetFile) {
  let current = absolutePath.split(path.sep).filter(Boolean);
  while (current.length) {
    let pathname = current.join(path.sep);

    if (absolutePath.charAt(0) === path.sep) {
      pathname = path.sep + pathname;
    }

    if (fs.readdirSync(pathname).indexOf(targetFile) >= 0) {
      return pathname;
    }

    current.pop();
  }

  return null;
}

function getModulesDir(fromDir) {
  if (!fs.existsSync(fromDir)) {
    return null;
  }

  let pathname = findInParents(fromDir, PACKAGE_JSON_NAME);
  if (pathname !== null) {
    return path.join(pathname, NODE_MODULES_DIR_NAME);
  }

  return null;
}

function resolveModule(value, fromDir, modulesDir) {
  let pathname = url.parse(value).pathname || '';

  if (pathname.startsWith('.')) { // relative
    return path.join(fromDir, pathname);
  } else if (pathname.startsWith('/')) { // absolute
    return value;
  } else if (modulesDir) { // node_modules
    let moduleDir = path.join(modulesDir, value);
    let packageFilename = path.join(moduleDir, PACKAGE_JSON_NAME);

    if (fs.existsSync(packageFilename)) {
      let pkg;
      try {
        pkg = JSON.parse(fs.readFileSync(packageFilename));
      } catch (e) {
        pkg = false;
      }

      if (pkg && pkg.main && !Array.isArray(pkg.main) && pkg.main !== MAIN_FILE_NAME_JS) {
        return path.join(moduleDir, pkg.main);
      }
    }

    return moduleDir;
  }
}

function checkPath(pathname, extensions) {
  pathname = fs.resolveExtension(pathname, extensions);

  if (!pathname) {
    return false;
  }

  if (fs.isDirectorySync(pathname)) {
    pathname = fs.resolveExtension(path.join(pathname, MAIN_FILE_NAME), extensions);
    if (!pathname) {
      return false;
    }
  }

  return true;
}

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

  const modulesDir = getModulesDir(fileDir) || '';

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

  value = resolveModule(value, fileDir, modulesDir);

  if (checkPath(value, extensions)) {
    return;
  }

  value = value.replace(fileDir + (/\/$/.test(fileDir) ? '' : path.sep), './');
  value = value.replace(modulesDir + (/\/$/.test(modulesDir) ? '' : path.sep), '');

  return `Cannot find module '${value}'`;
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
  const pluginSettings = (context && context.options && typeof context.options[0] === 'object') ? context.options[0] : {};

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
