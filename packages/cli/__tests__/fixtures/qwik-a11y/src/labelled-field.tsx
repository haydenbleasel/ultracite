import { component$ } from "@builder.io/qwik";

export const EmailField = component$(() => (
  <div>
    <label for="email">Email</label>
    <input autoFocus id="email" type="email" />
  </div>
));
