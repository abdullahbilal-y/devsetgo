<!-- devsetgo:generated -->
<div align="center">

# devsetgo

### Turn annotated source code into a runnable browser playground and architecture diagrams.

![Build Status](https://img.shields.io/github/actions/workflow/status/abdullahbilal-y/devsetgo/ci.yml?style=for-the-badge&label=build)
[![npm version](https://img.shields.io/npm/v/devsetgo?style=for-the-badge&color=0969da)](https://www.npmjs.com/package/devsetgo)
![License](https://img.shields.io/github/license/abdullahbilal-y/devsetgo?style=for-the-badge&color=009688)
[![Downloads](https://img.shields.io/npm/dm/devsetgo?style=for-the-badge&color=8957e5)](https://www.npmjs.com/package/devsetgo)
[![Interactive Playground](https://img.shields.io/badge/%E2%96%B6%20-Live%20Playground-7c3aed?style=for-the-badge)](https://abdullahbilal-y.github.io/devsetgo/)

<br/>

Generates a runnable browser playground and architecture diagrams from your annotated source code.

</div>


## 😤 The Problem

Two parts of a project's documentation go stale the moment anyone merges a pull request:
- Architecture diagrams drawn by hand, which quietly stop matching the real module structure
- Code examples pasted into Markdown, which nobody re-runs and which drift from the working code



## ✨ The Solution

devsetgo reads your source files directly, so both stay correct. It draws the architecture diagram from the imports it actually finds, and turns functions you tag with a comment into examples a reader can edit and run in the browser.


<div align="center">

<table>
<tr>
<td align="center"><h3>169</h3><sub>Tests</sub></td>
<td align="center"><h3>80%</h3><sub>Line Coverage</sub></td>
<td align="center"><h3>6</h3><sub>Runtime Deps</sub></td>
<td align="center"><h3>736 KB</h3><sub>Install Size</sub></td>
</tr>
</table>

</div>


## 🏗️ Architecture

```mermaid
graph TB
    root["root"]
    assets["assets<br/><sub>generateAssets</sub>"]
    src["src"]
    commands["commands"]
    parser["parser<br/><sub>parseProject</sub>"]
    playground["playground<br/><sub>generatePlayground</sub>"]
    readme["readme<br/><sub>GENERATED_MARKER, ReadmeOverwriteError, GenerateReadmeOptions...</sub>"]
    utils["utils"]
    assets --> parser
    assets --> utils
    src --> assets
    src --> commands
    src --> playground
    src --> readme
    src --> utils
    commands --> assets
    commands --> parser
    commands --> utils
    commands --> playground
    commands --> readme
    parser --> utils
    playground --> parser
    playground --> utils
    readme --> parser
    readme --> utils
    utils --> parser
```



## ⚡ Quick Start

Get up and running in under 30 seconds:

```bash
# Install
npm install -g devsetgo

# Run
devsetgo init
```


## 🎮 Interactive Playground

Try devsetgo directly in your browser — no installation required:

<div align="center">

**[▶ Launch Interactive Playground](https://abdullahbilal-y.github.io/devsetgo/)**

<sub>Runs entirely in your browser via WebAssembly. No data leaves your machine.</sub>

</div>


## 📋 Features

| Feature | Status | Description |
|---------|--------|-------------|
| **Code Parser** | ✅ stable | Finds functions you tagged with a @playground comment |
| **OpenAPI Parser** | ✅ stable | Reads an OpenAPI file and builds a request tester |
| **Markdown Parser** | ✅ stable | Splits Markdown into sections and finds code blocks |
| **WASM Playground** | ✅ stable | Runs your examples in the browser, sandboxed |
| **API Explorer** | ✅ stable | Send real API requests and copy them as cURL |
| **README Generator** | ✅ stable | Fills a Markdown template from your config file |
| **Architecture Diagrams** | ✅ stable | Mermaid diagrams drawn from your real imports |
| **Social Cards** | ✅ stable | Link preview images for social media |
| **Dev Server** | ✅ stable | Local server that reloads when you rebuild |


## 📊 Performance

<div align="center">

| Metric | Value |
|--------|-------|
| Tests | **169** |
| Line Coverage | **80%** |
| Runtime Deps | **6** |
| Install Size | **736 KB** |

</div>



---

<div align="center">

## 🚀 Get Started


**Install**

```bash
npm install -g devsetgo
```

<sub>Works on macOS, Linux, and Windows. Requires Node.js 20+.</sub>


</div>

---

## 🤝 Contributing

Contributions are welcome! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ by the [devsetgo](https://github.com/abdullahbilal-y/devsetgo) team**

</div>


<div align="center">

### Built With

![typescript](https://img.shields.io/badge/typescript--3178c6?style=flat-square&logo=typescript&logoColor=white) ![node](https://img.shields.io/badge/node--339933?style=flat-square&logo=nodedotjs&logoColor=white) ![typescript](https://img.shields.io/badge/typescript--3178c6?style=flat-square&logo=typescript&logoColor=white)

</div>
