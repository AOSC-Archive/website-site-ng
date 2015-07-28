To better collaborate on a website, it is recommended that you read through
this contributing guideline.

为了让您能更好地协作开发网站，建议您详细阅读以下的开发原则。

## Technical details 技术细节

- NodeJs is used as the main controller, router, and backend provider;
- Jade is used as the template engine;
- Stylus is used as the styling engine;
- Bootstrap is used as the main styling framework;

- 主控制器、网页路由、后端，使用的是 NodeJs 环境;
- 网页模版引擎使用 Jade;
- 样式表引擎使用 Stylus;
- 样式主框架为 Bootstrap;

### Development environment 开发环境

A valid `nodejs` install is all you need.

您只需要安装好 `nodejs` 就行。

## Branches 分支

**NEVER** push onto `master`, main development branch is `develop`, you
may start a branch whenever needed.

**绝不允许** 向 `master` 分支提交开发内容。主开发分支位与 `develop`，
当然你也可以在任何时候创建一个新的分支。

## Indents 缩进

Use soft indents with 2 spaces, for both YAML text content and Jade templates.

采用“软缩进”的方式——每个缩进两个半角空格，适用于 YAML 和 Jade。

## Page layout (artistic) 页面排版（美工）

Various artistic guideline on developing new pages.

一些开发新页面时的美术设计原则。

- A navigation bar / top bar that is fixed on the top;
- A banner when applicable, spreads through the horizontal space;
- Refer to existing style sheets (.styl) for guideline on styles;
- "Material"-like shadows on overlaying elements;

- 导航栏固定在页面最顶端;
- 横幅（Banner）如果有的话，要横向填满整个版面;
- 使用已有的预定义的样式表文件（.styl）来统一风格;
- 采用类似"Material"的元素阴影设计;
