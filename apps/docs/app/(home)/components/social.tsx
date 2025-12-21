import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Tweets } from "./tweets";

export const Social = () => (
  <div className="grid gap-8">
    <div className="mx-auto grid max-w-3xl gap-4 text-center">
      <h2 className="text-balance font-semibold text-3xl md:text-4xl tracking-tighter">
        What the community is <span className="italic">saying</span>
      </h2>
      <p className="text-balance text-lg text-muted-foreground tracking-tight">
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
    <Button variant="link" nativeButton={false} render={
      <Link href="/social">See all tweets</Link>
    } />
  </div>
);
