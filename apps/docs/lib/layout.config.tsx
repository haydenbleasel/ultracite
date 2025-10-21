import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

export const baseOptions: BaseLayoutProps = {
  links: [
    {
      text: "Home",
      url: "/",
      active: "none",
    },
    {
      text: "Docs",
      url: "/introduction",
      active: "none",
    },
  ],
  githubUrl: "https://github.com/haydenbleasel/ultracite",
  nav: {
    title: (
      <div className="flex items-center gap-2">
        <svg
          fill="none"
          height={18}
          viewBox="0 0 420 420"
          width={18}
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Ultracite</title>
          <path
            d="M105 315H210L315 210V0H420V250L250 420H0V0H105V315Z"
            fill="currentColor"
          />
          <path d="M420 420H335V335H420V420Z" fill="currentColor" />
        </svg>

        <p className="font-semibold text-xl tracking-tight">Ultracite</p>
      </div>
    ),
  },
};
