// Blume's content components, which a post's body needs for code fences,
// `:::` callouts and the rest: pages/blog/<slug>.astro passes this map to the
// post's <Content />. A post that uses one missing here fails the build with
// "Expected component X to be defined"; import it and add it.
import Badge from "blume/components/content/Badge.astro";
import Callout from "blume/components/content/Callout.astro";
import Card from "blume/components/content/Card.astro";
import CardGroup from "blume/components/content/CardGroup.astro";
import CodeBlock from "blume/components/content/CodeBlock.astro";
import CodeGroup from "blume/components/content/CodeGroup.astro";
import Diff from "blume/components/content/Diff.astro";
import FileTree from "blume/components/content/FileTree.astro";
import Frame from "blume/components/content/Frame.astro";
import Step from "blume/components/content/Step.astro";
import Steps from "blume/components/content/Steps.astro";
import Tab from "blume/components/content/Tab.astro";
import Tabs from "blume/components/content/Tabs.astro";
import Tooltip from "blume/components/content/Tooltip.astro";

export const components = {
  Badge,
  Callout,
  Card,
  CardGroup,
  CodeBlock,
  CodeGroup,
  Diff,
  FileTree,
  Frame,
  Step,
  Steps,
  Tab,
  Tabs,
  Tooltip,
};
