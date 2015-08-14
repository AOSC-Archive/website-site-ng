To better collaborate on a website, it is recommended that you read through
this contributing guideline.

为了让您能更好地协作开发网站，建议您详细阅读以下的开发原则。

## Technical details - 技术细节

- NodeJs is used as the main controller, router, and backend provider;
- Jade is used as the template engine;
- Stylus is used as the styling engine;
- Bootstrap is used as the main styling framework;

- 主控制器、网页路由、后端，使用的是 NodeJs 环境;
- 网页模版引擎使用 Jade;
- 样式表引擎使用 Stylus;
- 样式主框架为 Bootstrap;

### Development environment - 开发环境

A valid `nodejs` install is all you need.

您只需要安装好 `nodejs` 就行。

## Branches - 分支

**NEVER** push onto `master`, main development branch is `develop`, you
may start a branch whenever needed.

**绝不允许** 向 `master` 分支提交开发内容。主开发分支位与 `develop`，
当然你也可以在任何时候创建一个新的分支。

## Coding Style - 代码风格

**TODO: Translate this section to English.**

- Don't Repeat Yourself;
- 缩进 2 个空格；
- 所有代码统一优先使用双引号；
- Javascript 中任何变量必须有明确定义；
- 空格的使用遵循`function(x, y) {\n...\n}`；
- 极力避免肮脏的、语义晦涩难懂的代码，如有必要，必须书写清晰的注释说明；
- Jade 中的开发注释使用 `//-` 避免编译到 HTML 中；
- 兼容上，不考虑 IE8 及以前版本的浏览器。
