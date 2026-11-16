---
"ultracite": patch
---

`ultracite init` no longer refuses to write into a directory whose name starts with two dots, such as `..apps`. The check that keeps writes inside the project treated any relative path beginning with `..` as leaving it, so `init` stopped with "Refusing to write outside project". Only a leading `..` path segment is rejected now.
