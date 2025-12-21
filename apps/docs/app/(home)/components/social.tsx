import { DynamicLink } from "fumadocs-core/dynamic-link";
import { Button } from "@/components/ui/button";
import { Tweets } from "./tweets";

export const Social = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-medium font-serif text-3xl md:text-4xl lg:text-5xl">
        What the community is <span className="italic">saying</span>
      </h2>
      <p className="text-balance text-lg text-muted-foreground">
        Here's what some of the most in the most forward-thinking developers in
        the React ecosystem have to say about Ultracite.
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
      <DynamicLink href="/social">See all tweets</DynamicLink>
    </Button>
  </div>
);
