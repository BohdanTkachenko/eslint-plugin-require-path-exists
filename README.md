This repository will give access to new rules for the ESLint tool. You should use it only if you are developing a CommonJS application. It checks for require() function usage.

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

2. Enable the plugin by adding it to your `.eslintrc`:

    ```yaml
    plugins:
      - require-path-exists
    ```
3. You can also configure these rules in your `.eslintrc`. All rules defined in this plugin have to be prefixed by 'require-path-exists/'

    ```yaml
    plugins:
      - require-path-exists
    rules:
      - require-path-exists/exists: 2
      - require-path-exists/not_empty: 2
      - require-path-exists/too_many_arguments: 2
    ```

# Rules

| Name  | Description | Default Configuration |
| ------------- | ------------- | ------------- |
| exists  | You should only pass existent paths to require() | 'exists': 2 |
| not_empty | You should not call require() without arguments or with empty argument | 'not_empty': 2 |
| too_many_arguments | You should pass only one argument to require() function | 'too_many_arguments': 2 |

# ToDo

- Tests coverage.
- Check in different CommonJS environments (currently only tested in NodeJS and webpack).
- Remove dirty hack for Atom after [pull request](https://github.com/AtomLinter/linter-eslint/pull/89) in `linter-eslint` is merged.
- Think about more correct way to detect bundled NodeJS (and webpack) modules. Currently it is a constant array.

# License

MIT
