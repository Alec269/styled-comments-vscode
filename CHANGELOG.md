# Change Log

All notable changes to this project will be documented in this file.

## [1.0.0] - 08-04-2025

### Added

- Initial release
- Support for **8 different comment symbols** with colour highlighting ( `!`, `@`, `#`, `$`, `&`, `*`, `?` and `TODO:`)
- Line comment support
- Dynamic font weight matching VS Code editor settings
- Enable / disable commands
- Real-time highlighting updates while typing

## [1.0.1] - 2025

### Changed

- Slightly tweaked and improved colour palette for better readability

## [1.1.0] - 20-09-2025

### Added

- Extension is now **activated by default**

## [2.0.0] - 13-01-2026

### Added

- Expanded symbol support (now **12 total**):
  - `?` Question / uncertainty
  - `*` Important note
  - `!` Warning / alert
  - `@` Mention / reference
  - `TODO:` Task / reminder (bold + coloured)
  - `$` Cost / money related
  - `&` Connection / related info
  - `#` Tag / category
  - `%` Performance / metrics
  - `~` Approximate / soft note
  - `` ` `` Code / technical detail
  - `^` Improvement / optimization
- Proper block comment support `/* */`
- Language-aware styling across supported languages
- `.txt` file support using comment prefix `#;`
- More Colour palette changes

### Changed

- Better method of finding comments
- Improved block and line comment handling consistency
- More accurate symbol detection at comment start only

## [2.5.0] - 04-03-2026

### Fixed

- Fixed conflict with **Doxygen** & **JSDoc**
- Highlighting now, only happens **after** the comment symbol, instead of whole line

### Changed

- Expanded language list
- Highlighting fully **avoids** Doxygen & JSDoc

### New issues

- `TODO:` no longer  gets highlighted in regular block comments

## [2.6.0] - 05-03-2026

### Fixed

- Fixed newly discovered Issue with symbol recognition in line comments
- Extension should now behave as expected

### Changed

- Expanded language list to also support: `java`,`groovy`,`go`

### Existing issues

- `TODO:` still don't get highlighted in regular block comments
  - *Temporary fix* : add `//` before `TODO:` in block comments
