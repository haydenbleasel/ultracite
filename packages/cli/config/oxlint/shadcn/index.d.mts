declare const config: {
  jsPlugins: { name: string; specifier: string }[];
  rules: {
    "shadcn/no-arbitrary-values": ["error", { allow: "layout"[] }];
    "shadcn/no-inline-styles": "error";
    "shadcn/no-raw-colors": "error";
    "shadcn/no-restyle": ["error", { allow: "layout"[] }];
    "shadcn/no-unknown-classes": "error";
    "shadcn/require-static-classes": "error";
  };
  overrides: {
    files: string[];
    rules: {
      "shadcn/no-arbitrary-values": "off";
      "shadcn/no-restyle": "off";
      "shadcn/require-static-classes": "off";
    };
  }[];
};

export default config;
