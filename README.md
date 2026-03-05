# Styled Comments

Highlight specially marked comments in different colours to make notes, warnings, TODOs, and annotations stand out while coding. And it doesn't affect Doxygen or JSDoc.

![Example](images/ExampleImage.png)

## Features

Styled Comments applies colours **only inside real comments** (line comments and block comments) and supports many languages and even .txt files (`#;`).

Example for text files:

![Example](images/textEg.png)

### Supported symbols

| Symbol | Meaning | Style |
|------  |-------- |-------|
| `?` | Question / uncertainty | Blue |
| `*` | Important note | Lime green |
| `!` | Warning / alert | Red |
| `@` | Mention / reference | Yellow |
| `TODO:` | Task / reminder | **Bold + yellow** |
| `$` | Cost / money related | Purple |
| `&` | Connection / related info | Brown |
| `#` | Tag / category | Orange |
| `%` | Performance / metrics | Light green |
| `~` | Approximate / soft note | Pink |
| `` ` `` | Code / technical detail | Blue |
| `^` | Improvement / optimization | Teal |

## Support

Currently This supports the following languages `id`(s) :

- `dart`
- `csharp`
- `java`
- `go`
- `groovy`
- `c`
- `cpp`
- `asm`
- `nasm`
- `llvm`
- `gas`
- `rust`
- `zig`
- `odin`
- `powershell`
- `shellscript`
- `python`
- `cmake`
- `lua`
- `jsonc`
- `sql`
- `html`
- `css`
- `plaintext`
- `javascript`
- `typescript`
- `javascriptreact`
- `typescriptreact`

## Usage

Simply place one of the supported symbols **at the start of a comment**.

### Line comments

<code style="color : #449edaff">// ? What should this function return?</code><br>
<code style="color : #34c06eff">// * This is really important!</code><br>
<code style="color : #ce5d50ff">// ! Warning: This might cause issues</code><br>
<code style="color : #ccad31ff">// @ Remember to check with John</code><br>
<code style="color : #e2ca6bff">// <b>TODO:</b></code><code>Fix this bug</code><br>
<code style="color : #b375cc">// $ This costs $50 per month</code><br>
<code style="color : #b16127">// & Related to the user authentication</code><br>
<code style="color : #e67f59ff">// # Feature: Login system</code><br>
<code style="color : #a9d676ff">// % Performance impact needs review</code><br>
<code style="color : #db89c7ff">// ~ Approximately correct behaviour</code><br>
<code style="color : #5f66cc">// ` This involves low-level code</code><br>
<code style="color : #41b48e">// ^ Can be optimized later</code>

- Same can be done with block comments.
