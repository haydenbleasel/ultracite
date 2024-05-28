function x() {
  return 3;
}

function z() {}

const y = x();

const something_NOT_recommended = true;

const Component = () => (
  <>
    <div className="mx-5 my-5" />
    <a href="https://www.github.com" title="github.com">Learn more</a>
  </>
);

if (true) {
  z();
} else {
  z();
}

fetch('google.com');

// Instantiate PaymentRequest
const req = new PaymentRequest();

// Instantiate IntersectionObserver
const observer = new IntersectionObserver(() => {});

const foo = Object.values({});

const regex = /[a-zA-Z0-9_]/;
const regex = /[a-z0-9_]/i;
const clone = JSON.parse(JSON.stringify(foo));