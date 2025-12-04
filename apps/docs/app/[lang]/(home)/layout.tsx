import { HomeLayout as FumadocsHomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout";

const HomeLayout = async (props: LayoutProps<"/[lang]">) => (
  <FumadocsHomeLayout {...baseOptions()}>{props.children}</FumadocsHomeLayout>
);

export default HomeLayout;
