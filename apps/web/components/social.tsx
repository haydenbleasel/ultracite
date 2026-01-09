import { Button } from "@repo/design-system/components/ui/button";
import Link from "next/link";

import { Tweets } from "@/components/tweets";

export const Social = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-2xl tracking-tighter sm:text-3xl md:text-4xl">
        What the community is saying
      </h2>
      <p className="text-balance text-muted-foreground tracking-tight sm:text-lg">
        Here's what some of the most innovative and forward-thinking developers
        in the React ecosystem have to say about Ultracite.
      </p>
    </div>
    <Tweets
      tweets={[
        "1937342910519038142",
        "1955312886265368856",
        "1976732830487958011",
        "1969727618237820980",
      ]}
    />
    <Button asChild variant="link">
      <Link href="/social">See all tweets</Link>
    </Button>
  </div>
);
