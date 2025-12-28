"use client";

import { SiGithub } from "@icons-pack/react-simple-icons";
import { Button } from "@repo/design-system/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@repo/design-system/components/ui/input-group";
import {
  Collapsible,
  CollapsibleContent,
} from "fumadocs-ui/components/ui/collapsible";
import { ArrowUpIcon, ThumbsDown, ThumbsUp } from "lucide-react";
import { usePathname } from "next/navigation";
import { type SyntheticEvent, useEffect, useState, useTransition } from "react";
import { discuss } from "@/actions/discuss";
import { cn } from "@/lib/utils";

export interface Feedback {
  opinion: "good" | "bad";
  url?: string;
  message: string;
}

export interface ActionResponse {
  githubUrl: string;
}

interface Result extends Feedback {
  response?: ActionResponse;
}

interface FeedbackProps {
  className?: string;
}

export const Feedback = ({ className }: FeedbackProps) => {
  const url = usePathname();
  const [previous, setPrevious] = useState<Result | null>(null);
  const [opinion, setOpinion] = useState<"good" | "bad" | null>(null);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const item = localStorage.getItem(`docs-feedback-${url}`);

    if (item === null) {
      return;
    }

    setPrevious(JSON.parse(item) as Result);
  }, [url]);

  useEffect(() => {
    const key = `docs-feedback-${url}`;

    if (previous) {
      localStorage.setItem(key, JSON.stringify(previous));
    } else {
      localStorage.removeItem(key);
    }
  }, [previous, url]);

  const submit = (e?: SyntheticEvent) => {
    if (opinion === null) {
      return;
    }

    startTransition(() => {
      const feedback: Feedback = {
        opinion,
        message,
      };

      discuss(url, feedback).then((response) => {
        setPrevious({
          response,
          ...feedback,
        });
        setMessage("");
        setOpinion(null);
      });
    });

    e?.preventDefault();
  };

  const activeOpinion = previous?.opinion ?? opinion;

  return (
    <Collapsible
      onOpenChange={(v) => {
        if (!v) {
          setOpinion(null);
        }
      }}
      open={opinion !== null || previous !== null}
    >
      <div className={cn("flex items-center gap-4", className)}>
        <p className="font-medium text-sm">How is this guide?</p>
        <div className="flex items-center gap-1">
          <Button
            className={cn(
              "rounded-full bg-card",
              activeOpinion === "good" &&
                "border-green-500 bg-green-50 text-green-500 hover:bg-green-100 hover:text-green-600"
            )}
            disabled={previous !== null}
            onClick={() => {
              setOpinion("good");
            }}
            variant="outline"
          >
            <ThumbsUp />
            Good
          </Button>
          <Button
            className={cn(
              "rounded-full bg-card",
              activeOpinion === "bad" &&
                "border-red-500 bg-red-50 text-red-500 hover:bg-red-100 hover:text-red-600"
            )}
            disabled={previous !== null}
            onClick={() => {
              setOpinion("bad");
            }}
            variant="outline"
          >
            <ThumbsDown />
            Bad
          </Button>
        </div>
      </div>
      <CollapsibleContent className="mt-3 overflow-visible">
        {previous ? (
          <div className="flex flex-col items-center gap-3 px-3 py-6 text-center text-sm">
            <p>Thank you for your feedback!</p>
            <div className="flex flex-row items-center gap-2">
              <Button asChild size="sm">
                <a href={previous.response?.githubUrl} target="_blank">
                  <SiGithub className="size-4" fill="currentColor" />
                  View on GitHub
                </a>
              </Button>
              <Button
                onClick={() => {
                  setOpinion(previous.opinion);
                  setPrevious(null);
                }}
                size="sm"
                variant="outline"
              >
                Submit Again
              </Button>
            </div>
          </div>
        ) : (
          <form className="flex flex-col gap-3" onSubmit={submit}>
            <InputGroup className="bg-card shadow-none">
              <InputGroupTextarea
                autoFocus
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (!e.shiftKey && e.key === "Enter") {
                    submit(e);
                  }
                }}
                placeholder="Leave your feedback..."
                required
                value={message}
              />
              <InputGroupAddon align="block-end">
                <InputGroupButton
                  className="ml-auto rounded-full"
                  disabled={isPending}
                  size="icon-xs"
                  type="submit"
                  variant="default"
                >
                  <ArrowUpIcon />
                  <span className="sr-only">Send</span>
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
          </form>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};
