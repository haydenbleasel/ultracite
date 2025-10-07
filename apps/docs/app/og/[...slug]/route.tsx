import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { notFound } from "next/navigation";
import { ImageResponse } from "next/og";
import { source } from "@/lib/source";

export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ slug: string[] }> }
) => {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));

  if (!page) {
    notFound();
  }

  const geistBold = await readFile(
    join(process.cwd(), "app/og/[...slug]/Geist-Bold.ttf")
  );
  const geistRegular = await readFile(
    join(process.cwd(), "app/og/[...slug]/Geist-Regular.ttf")
  );

  return new ImageResponse(
    <div
      style={{
        backgroundSize: "80px 80px",
        backgroundImage:
          "linear-gradient(to right, #FF781A 1px, transparent 1px), linear-gradient(to bottom, #FF781A 1px, transparent 1px)",
      }}
      tw="flex flex-col justify-between items-start w-full h-full bg-[#ff6900] p-12 text-white"
    >
      <svg
        fill="none"
        height={48}
        viewBox="0 0 117 118"
        width={48}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Ultracite</title>
        <g fill="currentColor">
          <path d="m73.4415 3.08447-11.5112-3.08447-9.7007 36.2036-8.7579-32.68485-11.5116 3.08447 9.4625 35.31358-23.5687-23.5686-8.42691 8.4269 25.85191 25.8521-32.19444-8.6265-3.08446 11.5112 35.1764 9.4256c-.4027-1.7371-.6158-3.5471-.6158-5.4068 0-13.1637 10.6713-23.8349 23.835-23.8349s23.8349 10.6712 23.8349 23.8349c0 1.8477-.2104 3.6466-.6082 5.3734l31.9687 8.566 3.084-11.5113-35.3158-9.463 32.1968-8.6271-3.085-11.5112-35.3147 9.4624 23.5686-23.5684-8.4269-8.42693-25.4933 25.49343z" />
          <path d="m81.5886 65.0381c-.9869 4.1725-3.0705 7.9209-5.9294 10.9241l23.16 23.1603 8.4268-8.4269z" />
          <path d="m75.4254 76.2044c-2.8935 2.9552-6.55 5.1606-10.6505 6.297l8.4275 31.4516 11.5113-3.084z" />
          <path d="m64.345 82.6165c-1.9025.4891-3.8965.749-5.9514.749-2.2016 0-4.3335-.2985-6.3574-.8573l-8.4351 31.4808 11.5112 3.084z" />
          <path d="m51.6292 82.3922c-4.0379-1.193-7.6294-3.4264-10.4637-6.3902l-23.217 23.2171 8.4269 8.4269z" />
          <path d="m40.9741 75.7968c-2.7857-2.9824-4.8149-6.6808-5.7807-10.7889l-32.07328 8.5941 3.08444 11.5112z" />
        </g>
      </svg>
      <div tw="flex flex-col">
        <h1 tw="max-w-[48rem] text-[64px] font-bold leading-[69px] tracking-tighter m-0">
          {page.data.title}
        </h1>
        <p tw="text-[24px] font-normal leading-normal tracking-tighter mt-4 mb-0">
          {page.data.description}
        </p>
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Geist",
          data: geistBold,
          style: "normal",
          weight: 700,
        },
        {
          name: "Geist",
          data: geistRegular,
          style: "normal",
          weight: 400,
        },
      ],
    }
  );
};

export const generateStaticParams = () =>
  source.generateParams().map((page) => ({
    ...page,
    slug: [...page.slug, "image.png"],
  }));
