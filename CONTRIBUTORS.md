# Publishing

To publish this package, you will need to generate a Github Personal Access Token (PAT).

Log into Github and select Settings under your user account.

Select **Developer settings** on the sidebar.

Select **Personal access tokens**.

Generate a new token and select **No Expiration** and `write:packages`.

Create a `.npmrc` file in this project with the following text, replacing `[Token]` with your new PAT.

```
//npm.pkg.github.com/:_authToken=[TOKEN]
```

You may now pubish the project with `yarn publish`, which will also bump the version number, or `npm publish` which doesn't.