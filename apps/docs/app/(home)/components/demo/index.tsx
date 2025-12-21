import Image from "next/image";
import Background from "./background.jpg";

const Line = ({ children }: { children?: React.ReactNode }) => (
  <div>{children}</div>
);

const Gray = ({ children }: { children: React.ReactNode }) => (
  <span className="text-muted-foreground">{children}</span>
);

const Orange = ({ children }: { children: React.ReactNode }) => (
  <span className="text-orange-400">{children}</span>
);

const Green = ({ children }: { children: React.ReactNode }) => (
  <span className="text-green-400">{children}</span>
);

const Yellow = ({ children }: { children: React.ReactNode }) => (
  <span className="text-yellow-400">{children}</span>
);

const Output = () => (
  <>
    <Line>
      <Gray>$</Gray> ultracite fix
    </Line>
    <br />
    <Line>
      <Orange>Ultracite v6.3.11</Orange> fix
    </Line>
    <Line>
      <Gray>Found</Gray> 121 errors<Gray>.</Gray>
    </Line>
    <Line>
      <Green>✓</Green> <Gray>Finished in</Gray> 121ms <Gray>on</Gray> 196 files
      <Gray>.</Gray>
    </Line>
    <br />
    <Line>
      <Yellow>Here are the issues we couldn't fix automatically:</Yellow>
    </Line>
    <br />
    <Line>
      <Orange>apps/docs/app/og/[...slug]/route.tsx:39:8</Orange>{" "}
      <Gray>suppressions/unused</Gray>
    </Line>
    <Line>
      <Gray>
        Suppression comment has no effect. Remove the suppression or make sure
        you are suppressing the correct rule.
      </Gray>
    </Line>
    <br />
    <Line>
      <Gray>{"       38 │"}</Gray>
      {
        '     <div style={{ fontFamily: "Geist" }} tw="flex h-full w-full bg-black">'
      }
    </Line>
    <Line>
      <Orange>{"   >"}</Orange>
      <Gray>{"   39 │"}</Gray>
      {
        '       {/** biome-ignore lint/performance/noImgElement: "Required for Satori" */}'
      }
    </Line>
    <Line>
      <Gray>{"          │"}</Gray>
      {"        "}
      <Orange>
        {
          "^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^"
        }
      </Orange>
    </Line>
    <Line>
      <Gray>{"       40 │"}</Gray>
      {"       <img"}
    </Line>
    <Line>
      <Gray>{"       41 │"}</Gray>
      {'         alt="Vercel OpenGraph Background"'}
    </Line>
    <br />
    <Line>
      <Gray>────────────────────────────────────────────────────────────</Gray>
    </Line>
    <br />
    <Line>
      <Orange>apps/registry/app/[component]/route.ts:226:76</Orange>{" "}
      <Gray>lint/complexity/noExcessiveCognitiveComplexity</Gray>
    </Line>
    <Line>
      <Gray>Excessive complexity of 95 detected (max: 15).</Gray>
    </Line>
    <br />
    <Line>
      <Gray>{"      225 │"}</Gray>{" "}
    </Line>
    <Line>
      <Orange>{"   >"}</Orange>
      <Gray>{"  226 │"}</Gray>
      {
        " export const GET = async (_request: NextRequest, { params }: RequestProps) => {"
      }
    </Line>
    <Line>
      <Gray>{"          │"}</Gray>
      {
        "                                                                            "
      }
      <Orange>{"^^"}</Orange>
    </Line>
    <Line>
      <Gray>{"      227 │"}</Gray>
      {"   const { component } = await params;"}
    </Line>
    <Line>
      <Gray>{"      228 │"}</Gray>
      {'   const parsedComponent = component.replace(".json", "");'}
    </Line>
    <br />
    <Line>
      {"    "}
      <Orange>i</Orange> Please refactor this function to reduce its complexity
      score from 95 to the max allowed complexity 15.
    </Line>
    <br />
    <Line>
      <Gray>────────────────────────────────────────────────────────────</Gray>
    </Line>
    <br />
    <Line>
      <Orange>
        packages/elements/__tests__/chain-of-thought.test.tsx:23:69
      </Orange>{" "}
      <Gray>lint/suspicious/noEmptyBlockStatements</Gray>
    </Line>
    <Line>Unexpected empty block.</Line>
    <br />
    <Line>
      <Gray>{"       22 │"}</Gray>
      {"     // Suppress console.error for this test"}
    </Line>
    <Line>
      <Orange>{"   >"}</Orange>
      <Gray>{"   23 │"}</Gray>
      {
        '     const spy = vi.spyOn(console, "error").mockImplementation(() => {});'
      }
    </Line>
    <Line>
      <Gray>{"          │"}</Gray>
      {"                                                                     "}
      <Orange>{"^^"}</Orange>
    </Line>
    <Line>
      <Gray>{"       24 │"}</Gray>{" "}
    </Line>
    <Line>
      <Gray>{"       25 │"}</Gray>
      {"     expect(() =>"}
    </Line>
    <br />
    <Line>
      {"    "}
      <Orange>i</Orange> Empty blocks are usually the result of an incomplete
      refactoring. Remove the empty block or add a comment inside it if it is
      intentional.
    </Line>
  </>
);

export const Demo = () => (
  <div className="relative isolate overflow-hidden rounded-xl sm:rounded-2xl md:rounded-3xl">
    <Image
      alt=""
      className="absolute top-0 left-0 size-full object-cover"
      height={1000}
      src={Background}
      width={1000}
    />
    <div className="size-full sm:px-16 sm:pt-16">
      <div className="max-h-128 overflow-y-auto bg-black/80 p-8 backdrop-blur-sm sm:rounded-x-2xl sm:rounded-t-2xl">
        <pre className="font-mono text-sm text-white">
          <code>
            <Output />
          </code>
        </pre>
      </div>
    </div>
  </div>
);
