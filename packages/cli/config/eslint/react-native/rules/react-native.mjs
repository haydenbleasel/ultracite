import metaPlugin from "@react-native/eslint-plugin";
import plugin from "eslint-plugin-react-native";

const enableAll = (prefix, { rules }) =>
  Object.fromEntries(
    Object.keys(rules)
      .filter((key) => !rules[key].meta?.deprecated)
      .map((key) => [`${prefix}/${key}`, "error"])
  );

const baseRules = {
  ...enableAll("react-native", plugin),
  ...enableAll("@react-native", metaPlugin),
};

const overrideRules = {};

const config = Object.assign(baseRules, overrideRules);

export default config;
