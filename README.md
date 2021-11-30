# Web Component 模块系统

# 目标

为 Web Component 设计一个模块系统，使 Web Component 更好的实现良好的组件化，以便集成在现有的 ES module 的基础设施中，并且能够在当今的浏览器中立即能工作。

# 动机

ES module 的引入为 JavaScript 开发人员提供了一些好处，包括更多的组件化代码和更好的依赖性管理。然而，自定义元素的 JavaScript 脚本与 HTML 标签之间没有任何显著的联系，这些不利于静态分析工具进行检查，在一些诸如无代码、无代码的系统中也会增加依赖管理的复杂度。

# 提议内容

实现一个 Web Component Modules 的加载器，它通过 `is="web-component-module"` 属性来识别 Web Component Modules，然后根据 `src` 或者 `import` 属性来载入自定义元素的 Class、完成自定元素注册等流程。

```html
<my-element is="web-component-module" src="./index.js"></my-element>
<hello-world is="web-component-module" src="./index.js"></hello-world>
```

```js
// index.js
export default class extends HTMLElement {
  constructor() {
    super();
    const shadowRoot = this.attachShadow({ mode: 'closed' });
    shadowRoot.innerHTML = `
      <slot name="main">no content</slot>
    `;
  }
}
```

### 裸模块

[import maps](https://github.com/WICG/import-maps) 这样的标准将允许浏览器理解这些类型的导入，而无需转换步骤，这使得我们可以在浏览器中实现版本管理与共享依赖，而不需要 package.json 文件与构建工具。

```html
<script type="importmap">
{
  "imports": {
    "@org/app": "https://cdn.jsdelivr.net/npm/@org/app/dist/esm/main.js"
  }
}
</script>
<my-element is="web-component-module" import="@org/app"></my-element>
```

`import` 与 `src` 属性的不同：`import` 属性不会自动补全路径，加载器会优先读取它的原始值去加载模块。

### 处理浏览器兼容

`system` 格式被设计为 `esm` 的过渡格式，它解决了 `esm` [import maps](https://github.com/WICG/import-maps) 浏览器兼容性的问题。几乎所有的构建工具都支持输出 `system` 格式，因此我们推荐在生产环境中使用它，以便未来能够无缝过渡到 Web 标准。

```html
<script type="systemjs-importmap">
{
  "imports": {
    "@org/app": "https://cdn.jsdelivr.net/npm/@org/app/dist/system/main.js"
  }
}
</script>

<my-element is="web-component-module" type="system" import="@org/app"></my-element>
```

## 替代方案对比

目前 W3C 有两个关于解决此问题的提案，分别是：

* [html-imports](https://www.w3.org/TR/html-imports/)
* [html-modules-explainer](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md)

[html-imports](https://www.w3.org/TR/html-imports/) 提议（并在Chromium中实现），但它们是独立于 ES6 模块开发的，有几个限制：

* **全局对象污染**：默认情况下，在 html-imports 中创建的变量显示在全局对象上
* **阻塞执行**：html-imports 的解析将阻止主文档的解析器

[html-modules-explainer](https://github.com/WICG/webcomponents/blob/gh-pages/proposals/html-modules-explainer.md) 解决了 [html-imports](https://www.w3.org/TR/html-imports/) 的一些问题，但是没有浏览器实现它，并且也没有任何工具来支持它。

## 指引和例子

### 安装加载器

```bash
npm install @web-widget/web-component-module
```

### 使用

```html
<hello-world is="web-component-module" src="./index.js">
  <p slot="main">hello wrold</p>
</hello-world>

<script type="module">
  import { WebComponentModule } from '@web-widget/web-component-module';
  WebComponentModule.update(document);
</script>
```

### 编写插件

例如支持 SystemJS 格式的插件：

```js
WebComponentModule.loaders.define('system', async options => {
  const nameOrPath = options.import || options.src;
  if (!nameOrPath) {
    throw new Error(`No 'src' or 'import' attributes were found`);
  }

  return System.import(/* webpackIgnore: true */ nameOrPath).then(
    module => module.default || module
  );
});
```

使用 `type="system"` 来指定 JavaScript 自定义模块类型：

```html
<my-element is="web-component-module" type="system" import="./index.js"></my-element>
```