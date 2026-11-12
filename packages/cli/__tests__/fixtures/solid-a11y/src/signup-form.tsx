export const SignupForm = (props: { readonly submit: () => void }) => (
  <form>
    <img src="/logo.png" />
    <div onClick={() => props.submit()}>Send</div>
  </form>
);
