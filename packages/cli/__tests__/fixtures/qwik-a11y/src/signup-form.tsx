import { component$ } from "@builder.io/qwik";
import type { QRL } from "@builder.io/qwik";

export const SignupForm = component$(
  (props: { readonly submit$: QRL<() => void> }) => (
    <form>
      <img height={32} src="/logo.png" width={32} />
      <a onClick$={props.submit$}>Help</a>
      <div onClick$={props.submit$}>Send</div>
    </form>
  )
);
