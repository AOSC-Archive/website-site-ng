What are all these?
===================

Don't panic! AOSC OS comes in a variety of flavors, with multiple architectures
supported. However, we (tried to) believe they are quite logically arranged
according to:

- Variants (desktop environments and features).
- Architectures.
- Installation media types (Live media, tarball, etc.).

So what are all that you just listed then? Let me finish...

Variants
--------

AOSC OS provides different variants based on different desktop
environments provided, and what they are used for (in the case of BuildKit, a
specialized as a minimal development environment for quick deployment).
As what AOSC OS is designed as, usually people will go with a variant with
desktop environment with full desktop environments. For lower performance
(older PCs), semi-embedded (yeah that doesn't count...) systems like a Intel
NUC, or boards like a Raspberry Pi, you might want to go with the "Base"
variant - which has no desktop environment pre-installed, and comes with the
least amount of packages to get you started (keep that happy hacking on).

Architectures
-------------

AOSC OS is not only available for AMD64. ARMv7, ARMv8, and MIPS (more to come!)
are all under our sphere of influence (fear us). Only the "Base" and "BuildKit"
variant comes in multiple architectures, variants with desktop environments are
currently only available to AMD64 users.

Installation media types
------------------------

AOSC OS is available in multiple media types:

- Live media, which you can boot up or install AOSC OS with.
- Tarballs, essentially a compressed system root filesystem, directly deployed
to an empty partition (expert mode? no...).
- Raw images, mostly for ARM devices that you can write directly to your SD or
MicroSD cards.
- Docker, a container engine for quick deployment.
- Qemu images, for virtual machine installation.

For more detailed installation instructions, please move over to our
[Wiki](https://github.com/AOSC-Dev/aosc-os/wiki).
