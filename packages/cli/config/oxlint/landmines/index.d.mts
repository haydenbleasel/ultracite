declare const config: {
  jsPlugins: { name: string; specifier: string }[];
  rules: {
    "landmines-structure/colocated-tests": "error";
    "landmines-structure/package-exports": "error";
    "landmines-structure/test-file-names": "error";
    "landmines-style/no-comments": "error";
    "landmines-testing/no-fixed-sleep": "error";
    "landmines-testing/no-flake-masking": "error";
    "landmines-testing/no-test-doubles": "error";
    "landmines-testing/no-unsignaled-poll": "error";
    "landmines-testing/strict-msw": "error";
    "landmines-types/no-explicit-return-types": "error";
  };
};

export default config;
