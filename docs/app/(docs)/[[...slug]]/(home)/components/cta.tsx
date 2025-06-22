import { Installer } from './installer';

export const CallToAction = () => (
  <div className='grid gap-6 rounded-3xl border bg-foreground/5 px-8 py-8 sm:py-16 sm:text-center md:py-24 lg:py-32'>
    <div className="flex flex-col items-center justify-center gap-2 text-center">
      <h2 className="font-semibold text-3xl">
        Install in seconds. Run in milliseconds.
      </h2>
      <p className="text-lg text-muted-foreground">
        Install Ultracite and start shipping code faster.
      </p>
    </div>
    <div className="mx-auto w-full max-w-md">
      <Installer />
    </div>
  </div>
);
