import { WrenchIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export const Assistant = () => (
  <div className="relative isolate flex h-full flex-col items-start gap-4 overflow-hidden p-4 text-muted-foreground text-xs">
    <Textarea
      className="h-auto w-full resize-none overflow-hidden bg-transparent shadow-none p-3 text-xs md:text-xs"
      readOnly
      value="Generate me a new UserCard component."
    />
    <p>Sure! I'll generate a new UserCard component for you.</p>
    <div className="flex items-center gap-2 rounded-full bg-secondary px-2.5 py-1">
      <WrenchIcon className="size-3" />
      <p>Using Ultracite</p>
    </div>
    <p>I found several issues with the code. Here's a list of suggestions:</p>
    <ol className="grid list-decimal gap-2 pl-4">
      <li>
        <p>
          React is imported but not used. This is a common pattern in React
          codebases, but it's not necessary. You can destructure the import to
          use the React object.
        </p>
      </li>
      <li>
        <p>
          It is not necessary to wrap the return statement in a div. You can
          return the JSX directly.
        </p>
      </li>
      <li>
        <p>
          Extract types into a type definition rather than providing them
          inline. This will make the code more readable and maintainable.
        </p>
      </li>
    </ol>
  </div>
);
