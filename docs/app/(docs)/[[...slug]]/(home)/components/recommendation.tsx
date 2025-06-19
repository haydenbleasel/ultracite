import { Tweet } from 'react-tweet';

export const Recommendation = () => (
  <div className="grid grid-cols-2 gap-8 rounded-xl bg-secondary p-16">
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      <h2 className="font-semibold text-3xl">Recommended by the GOAT</h2>
      <p className="mx-auto max-w-sm text-balance text-muted-foreground sm:text-lg">
        An invaluable tool for any developer. If you can make it past the
        initial code roasting.
      </p>
    </div>
    <div className="flex items-center justify-center">
      {/** biome-ignore lint/nursery/useUniqueElementIds: "This is a tweet ID" */}
      <Tweet id="1882412853656977654" />
    </div>
  </div>
);
