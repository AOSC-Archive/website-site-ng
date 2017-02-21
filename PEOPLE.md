Contributor Page Quick Start
============================

To show our appreciation to contributors and developers of AOSC projects
(AOSC OS, website alike), we have created a framework where all developers and
contributors are listed. You may take advantage of this new addition and create
your own personal page under the name of AOSC, or create a redirection to your
own personal webpage/blog.

This document is created to aid your deployment of your personal AOSC page, and
further communication with website maintainers.

First step, introduce yourself
------------------------------

Your name is now listed on the "People" page on the AOSC Portal with your GitHub
username and your GitHub avatar (grabbed using GitHub API). While optional,
you may provide your full name (or the name you prefer to represent yourself
with), and a short setence describing yourself. To do this:

Clone this repository, and checkout the `develop` branch:

```
git clone -b develop https://github.com/AOSC-Dev/website-site-ng
```

Open up the people catalog YAML file with your favourite editor, and you may
find structured configuration in units as follows:

```
-
  fullname:
  username: artoria2e5
  description:
  longdesc:
  rurl:
```

Where:

 - `fullname` contains your full name (or the name you prefer to represent
 yourself with; optional).
 - `username` contains your GitHub ID, please do not change this.
 - `description` contains a (very) short line describing yourself.
 - `longdesc` contains a longer description of yourself, which will show up in
 your personal page along with content of `description`.
 - `rurl` contains the URL you wish to replace your personal page with (filling
 in this field will replace your personal page with your own blog; optional).

Creating your page (if `rurl` not specified)
--------------------------------------------

You may now proceed to create your own page, you may use a Markdown or Jade/PUG
document to achieve this. An example would be the project pages, here below is
our AOSC OS project page, and your personal page would be created in a similar
fashion.

### The Markdown way

Just create a `.md` file in `/contents/people` with the filename of
`username.md` - where `username` is your GitHub ID.

**You won't be able to utilize the right portion of the page if you choose to
use Markdown, Jade/PUG is easy, just learn it!**

### The Jade/PUG way

This may be a bit more complex, but yields more flexibility in your page design.
A template could be found in `/views/people/_example.pug`. Create your own
Jade/PUG page in `/views/people` with the filename of `username.pug` - where
`username` is your GitHub ID. Here below is a simple break down of the file
structure:

```
extend _template
```

This is a template extension statement, giving you a unified look to your page,
with other pages on the website. Please, do not remove this line, your page
won't render.

```
block content
  +project-wrapper
    +project-main
      :markdown-it
```

This is your content block, where your main text goes. You may have noticed the
`:markdown-it` line, after this line, you may add any Markdown structure to
compose your page content. Or if you are cooler than most of us with using
Jade/PUG markings, you may remove this line and do it your way.

```
+people-side-panel
```

Below this line contains the content of the side panel of your page. Again,
you may use Markdown or Jade/PUG markings to your advantage. And here below is
an example containing a link.

```
+people-side-panel
  h1 Links
  p: a(href="https://example.org/") Test.
```

Or, a series of buttons (stolen from the AOSC OS [project page](/projects/aosc-os)).

```
+people-side-panel
  h1 Links

  h2 For users
  a.btn.btn-primary(href="/os-download") Download AOSC OS

  h2 For developers
  p: a.btn.btn-warning(href="https://github.com/AOSC-Dev/aosc-os-core/") AOSC OS Core
  p: a.btn.btn-warning(href="https://github.com/AOSC-Dev/aosc-os-abbs/") AOSC OS Package Tree
```

**Please note that with Jade/PUG, indents are not trivial, they represent
actual class hierarchies.**

Submitting your page
--------------------

Submit your page as a Pull Request to the `develop` branch after you're done.

Issues, Questions
-----------------

The quickest way is to contact @JeffBai or @liushuyu on IRC/Telegram (#aosc).

Remove my name!
---------------

If you want your name removed from the page, please file an issue [here](https://github.com/AOSC-Dev/website-site-ng/issues).
