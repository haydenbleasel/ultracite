import { HomeLayout as FumadocsHomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "@/lib/layout";

const HomeLayout = async (props: LayoutProps<"/[lang]">) => (
  <FumadocsHomeLayout {...baseOptions()}>
    <div className="relative mx-auto grid w-full max-w-(--fd-layout-width) gap-24 px-4 sm:gap-32">
      {props.children}
    </div>
  </FumadocsHomeLayout>
);

export default HomeLayout;
