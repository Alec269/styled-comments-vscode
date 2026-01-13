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
  - `TODO:` Task / reminder (bold + colored)
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
