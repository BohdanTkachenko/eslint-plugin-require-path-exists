[![NPM](https://nodei.co/npm/eslint-plugin-require-path-exists.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/eslint-plugin-require-path-exists/)

[![Greenkeeper badge](https://badges.greenkeeper.io/BohdanTkachenko/eslint-plugin-require-path-exists.svg)](https://greenkeeper.io/)
[![Dependency Status](https://david-dm.org/BohdanTkachenko/eslint-plugin-require-path-exists.svg?style=flat-square)](https://david-dm.org/BohdanTkachenko/eslint-plugin-require-path-exists)
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/BohdanTkachenko/eslint-plugin-require-path-exists.svg)](http://isitmaintained.com/project/BohdanTkachenko/eslint-plugin-require-path-exists "Average time to resolve an issue")
[![Percentage of issues still open](http://isitmaintained.com/badge/open/BohdanTkachenko/eslint-plugin-require-path-exists.svg)](http://isitmaintained.com/project/BohdanTkachenko/eslint-plugin-require-path-exists "Percentage of issues still open")

This repository will give access to new rules for the ESLint tool. You should use it only if you are developing a CommonJS application. It checks for require() function usage (or for import, if you're using ES6 syntax).

# Features

- Supports both `require()` and ES6 `import` syntax
- Supports aliases in webpack
- Supports different file extensions
- Works in Atom with `linter-eslint` package

# Usage

1. Install `eslint-plugin-require-path-exists` as a dev-dependency:

    ```shell
    npm install --save-dev eslint-plugin-require-path-exists
    ```

2. Enable the plugin by adding it to the `plugins` and start from default (recommended) configuration in `extends` in `.eslintrc`:

    ```js
    {
      "extends": [
        "plugin:require-path-exists/recommended"
      ],
      "plugins": [
        "require-path-exists"
      ]
    }
    ```
3. You can also configure these rules in your `.eslintrc`. All rules defined in this plugin have to be prefixed by 'require-path-exists/'

```js
{
  "plugins": [
	"require-path-exists"
  ],
  "rules": {
	"require-path-exists/notEmpty": 2,
	"require-path-exists/tooManyArguments": 2,
	"require-path-exists/exists": [ 2, {
	  "extensions": [
		"",
		".jsx",
		".es.js",
		".jsx",
		".json5",
		".es",
		".es6",
		".coffee"
	  ],
	  "webpackConfigPath": "webpack.config.js"
	}]
  }
}
```

# Rules

| Name                                 | Description                                                            | Default Configuration |
| ------------------------------------ | ---------------------------------------------------------------------- | --------------------- |
| require-path-exists/notEmpty         | You should not call require() without arguments or with empty argument | ```2```               |
| require-path-exists/tooManyArguments | You should pass only one argument to require() function                | ```2```               |
| require-path-exists/exists           | You should only pass existing paths to require()                       | ```[ 2, { "extensions": [ "", ".js", ".json", ".node" ], "webpackConfigPath": null }]``` |

# Changelog
- **1.1.5**: Use [resolve](https://www.npmjs.com/package/resolve) instead of some functions (thanks to [@dominicbarnes](https://github.com/dominicbarnes))
- **1.1.4**: Correctly exec webpack config in Atom
- **1.1.3**: Output errors when trying to load webpack config
- **1.1.2**: In order to have aliases working you now should provide webpackConfigPath config value.
- **1.1.1**: Correctly resolve node built-in modules, using [builtin-modules](https://www.npmjs.com/package/builtin-modules) npm package (thanks to [@antialias](https://github.com/antialias))
- **1.1.0**: Resolving of webpack file extensions is not supported anymore (thanks to [@lilianammmatos](https://github.com/lilianammmatos)). Please manually provide extensions to plugin config instead.

# TODO

- Tests coverage.
- Check in different CommonJS environments (currently only tested in NodeJS and webpack).

# License

MIT
