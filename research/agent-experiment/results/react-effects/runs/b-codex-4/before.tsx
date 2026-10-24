/*
 * Source:    supabase/supabase — apps/studio/components/interfaces/Database/Backups/PITR/TimeInput.tsx,
 *            line 4 and lines 10-156 (the whole file but its other imports)
 * Commit:    09f80f528ec47569841408a81668dff90525c48a (2026-10-16T10:16:52+13:00)
 * Permalink: https://github.com/supabase/supabase/blob/09f80f528ec47569841408a81668dff90525c48a/apps/studio/components/interfaces/Database/Backups/PITR/TimeInput.tsx#L38-L47
 * Component: TimeInput (default export), the HH:MM:SS input of Supabase Studio's point-in-time
 *   recovery form (PITRForm.tsx L202-L217 at the same commit).
 * Line 4 and lines 10-156 are copied, with their formatting changed. The stubs above them replace the
 * other imports (lines 1-3 and 5-8). Anything marked STUB is not part of the original source.
 *
 * License of the source repository: Apache License 2.0 (supabase/supabase/LICENSE). Licensed under the
 * Apache License, Version 2.0; you may obtain a copy of the License at
 * http://www.apache.org/licenses/LICENSE-2.0. This file is a modified copy: its imports were replaced by
 * the stubs marked STUB.
 */

// STUB (not part of the original source): what lines 1-3 and 5-8 import, reduced to what this file
// uses. Time is copied from ./PITR.types.ts, and formatNumberToTwoDigits and formatTimeToTimeString
// from ./PITR.utils.ts (L26-L38), at the same commit. dayjs parses only the strict HH:mm:ss form this
// file uses. lodash's isNaN is Number.isNaN for numbers. The icon and tooltip components render their
// children (a closed tooltip shows no content).
export interface Time {
  h: number;
  m: number;
  s: number;
}

export const formatNumberToTwoDigits = (number: number) =>
  number.toLocaleString("en-US", {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });

// Formats Time object to hh:mm:ss
export const formatTimeToTimeString = (time: Time) =>
  `${formatNumberToTwoDigits(time.h)}:${formatNumberToTwoDigits(
    time.m
  )}:${formatNumberToTwoDigits(time.s)}`;

interface Day {
  isValid: () => boolean;
  isBefore: (o: Day) => boolean;
  isAfter: (o: Day) => boolean;
  seconds: number;
}
const dayjs = (value: string, _format: "HH:mm:ss", _strict: true): Day => {
  const m = /^(\d{2}):(\d{2}):(\d{2})$/.exec(value);
  const ok =
    m !== null && Number(m[1]) < 24 && Number(m[2]) < 60 && Number(m[3]) < 60;
  const seconds = ok
    ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])
    : Number.NaN;
  return {
    isAfter: (o) => seconds > o.seconds,
    isBefore: (o) => seconds < o.seconds,
    isValid: () => ok,
    seconds,
  };
};
const isNaN = (value: unknown) =>
  typeof value === "number" && Number.isNaN(value);
const noop = () => {};
const ClockIcon = (_props: {
  className?: string;
  size?: number;
  strokeWidth?: number;
}) => null;
const Tooltip = ({ children }: { children?: React.ReactNode }) => (
  <>{children}</>
);
const TooltipTrigger = ({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
  tabIndex?: number;
}) => <span className={className}>{children}</span>;
const TooltipContent = (_props: {
  children?: React.ReactNode;
  side?: string;
}) => null;
// ── end of STUB ────────────────────────────────────────────────────────

import type { ChangeEvent } from "react";
import { useEffect, useState } from "react";

// [Joshen] This is trying to do the same thing as TimeSplitInput.tsx
// so can we please look to try to combine these 2 components together if possible
// The problem with TimeSplitInput is that it's tightly coupled to the date + its
// tightly coupled to the context of a range. Ideally it should be more modular
// which is what this component is trying to achieve

// [Joshen] Potential extension, give option to toggle 24 hours or AM/PM

interface TimeInputProps {
  defaultTime?: Time;
  minimumTime?: Time;
  maximumTime?: Time;
  onChange?: (time: Time) => void;
}

const TimeInput = ({
  defaultTime,
  minimumTime,
  maximumTime,
  onChange = noop,
}: TimeInputProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string>();
  const [time, setTime] = useState<Time>(defaultTime || { h: 0, m: 0, s: 0 });

  const formattedMinimumTime = minimumTime
    ? dayjs(formatTimeToTimeString(minimumTime), "HH:mm:ss", true)
    : undefined;

  const formattedMaximumTime = maximumTime
    ? dayjs(formatTimeToTimeString(maximumTime), "HH:mm:ss", true)
    : undefined;

  useEffect(() => {
    if (minimumTime || maximumTime) {
      validate(time);
    }
  }, [JSON.stringify(minimumTime), JSON.stringify(maximumTime)]);

  useEffect(() => {
    if (defaultTime) {
      setTime(defaultTime);
      validate(defaultTime);
    }
  }, [defaultTime]);

  const validate = (time: Time) => {
    let error;
    const formattedTime = dayjs(formatTimeToTimeString(time), "HH:mm:ss", true);

    if (!formattedTime.isValid()) {
      error = "Please enter a valid time";
    } else if (
      formattedMinimumTime &&
      formattedTime.isBefore(formattedMinimumTime)
    ) {
      error = "Selected time is before the minimum time allowed";
    } else if (
      formattedMaximumTime &&
      formattedTime.isAfter(formattedMaximumTime)
    ) {
      error = "Selected time is after the maximum time allowed";
    }

    setError(error);
    return error === undefined;
  };

  const onFocus = () => setIsFocused(true);

  const onInputChange = (
    event: ChangeEvent<HTMLInputElement>,
    unit: "h" | "m" | "s"
  ) => {
    if (isNaN(Number(event.target.value))) {
      return;
    }
    setTime({ ...time, [unit]: event.target.value });
  };

  const onInputBlur = (
    event: ChangeEvent<HTMLInputElement>,
    unit: "h" | "m" | "s"
  ) => {
    const formattedInput = Number(event.target.value);
    const updatedTime = { ...time, [unit]: formattedInput };
    setTime(updatedTime);

    validate(updatedTime);
    onChange(updatedTime);
    setIsFocused(false);
  };

  return (
    <>
      <div
        className={[
          "flex items-center justify-between transition",
          "rounded-md bg-studio border px-3.5 py-2 w-[200px]",
          `${
            isFocused
              ? "border-stronger"
              : error === undefined
                ? "border-strong"
                : "border-red-800"
          }`,
        ].join(" ")}
      >
        <ClockIcon
          className="text-foreground-light"
          size={18}
          strokeWidth={1.5}
        />
        <Tooltip>
          <TooltipTrigger className="w-1/4" tabIndex={-1}>
            <input
              type="text"
              maxLength={2}
              pattern="[0-9]*"
              placeholder="HH"
              value={formatNumberToTwoDigits(time.h)}
              onFocus={onFocus}
              aria-label="Hours"
              onBlur={(event) => onInputBlur(event, "h")}
              onChange={(event) => onInputChange(event, "h")}
              className="w-full border-none bg-transparent p-0 text-center text-sm outline-hidden focus:ring-0"
            />
          </TooltipTrigger>

          <TooltipContent side="bottom">Hours (HH)</TooltipContent>
        </Tooltip>
        <span>:</span>
        <Tooltip>
          <TooltipTrigger className="w-1/4" tabIndex={-1}>
            <input
              type="text"
              maxLength={2}
              pattern="[0-9]*"
              placeholder="MM"
              value={formatNumberToTwoDigits(time.m)}
              onFocus={onFocus}
              aria-label="Minutes"
              onBlur={(event) => onInputBlur(event, "m")}
              onChange={(event) => onInputChange(event, "m")}
              className="w-full border-none bg-transparent p-0 text-center text-sm outline-hidden focus:ring-0"
            />
          </TooltipTrigger>

          <TooltipContent side="bottom">Minutes (MM)</TooltipContent>
        </Tooltip>
        <span>:</span>
        <Tooltip>
          <TooltipTrigger className="w-1/4" tabIndex={-1}>
            <input
              type="text"
              maxLength={2}
              pattern="[0-9]*"
              placeholder="SS"
              value={formatNumberToTwoDigits(time.s)}
              onFocus={onFocus}
              aria-label="Seconds"
              onBlur={(event) => onInputBlur(event, "s")}
              onChange={(event) => onInputChange(event, "s")}
              className="w-full border-none bg-transparent p-0 text-center text-sm outline-hidden focus:ring-0"
            />
          </TooltipTrigger>
          <TooltipContent side="bottom">Seconds (SS)</TooltipContent>
        </Tooltip>
      </div>
      {error && <p className="text-sm text-red-900">{error}</p>}
    </>
  );
};

export default TimeInput;
