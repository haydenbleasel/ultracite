"use client";

import { motion } from "motion/react";

export const MonoreposGraphic = () => {
  // Helper function to generate random delay between min and max seconds
  const randomDelay = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  // Helper function to generate random duration between min and max seconds
  const randomDuration = (min: number, max: number) =>
    Math.random() * (max - min) + min;

  return (
    <motion.svg
      className="-rotate-12 -translate-y-12 -translate-x-4 text-muted-foreground"
      fill="none"
      height="500"
      initial={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      viewBox="0 0 1067 500"
      viewport={{ once: true, amount: 0.3 }}
      whileInView={{ opacity: 0.4 }}
      width="1067"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>Monorepo diagram</title>

      {/* Package rectangles with staggered animations */}
      <motion.rect
        fill="none"
        height="126"
        initial={{ opacity: 0, scale: 0.8 }}
        rx="15.5"
        stroke="currentColor"
        transition={{
          duration: randomDuration(0.4, 0.8),
          delay: randomDelay(0, 0.6),
        }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, scale: 1 }}
        width="126"
        x="470.5"
        y="356.5"
      />
      <motion.rect
        fill="none"
        height="126"
        initial={{ opacity: 0, scale: 0.8 }}
        rx="15.5"
        stroke="currentColor"
        transition={{
          duration: randomDuration(0.4, 0.8),
          delay: randomDelay(0, 0.6),
        }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, scale: 1 }}
        width="126"
        x="705.5"
        y="178.5"
      />
      <motion.rect
        fill="none"
        height="126"
        initial={{ opacity: 0, scale: 0.8 }}
        rx="15.5"
        stroke="currentColor"
        transition={{
          duration: randomDuration(0.4, 0.8),
          delay: randomDelay(0, 0.6),
        }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, scale: 1 }}
        width="126"
        x="470.5"
        y="178.5"
      />
      <motion.rect
        fill="none"
        height="126"
        initial={{ opacity: 0, scale: 0.8 }}
        rx="15.5"
        stroke="currentColor"
        transition={{
          duration: randomDuration(0.4, 0.8),
          delay: randomDelay(0, 0.6),
        }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, scale: 1 }}
        width="126"
        x="470.5"
        y="0.5"
      />
      <motion.rect
        fill="none"
        height="126"
        initial={{ opacity: 0, scale: 0.8 }}
        rx="15.5"
        stroke="currentColor"
        transition={{
          duration: randomDuration(0.4, 0.8),
          delay: randomDelay(0, 0.6),
        }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, scale: 1 }}
        width="126"
        x="0.5"
        y="0.5"
      />
      <motion.rect
        fill="none"
        height="126"
        initial={{ opacity: 0, scale: 0.8 }}
        rx="15.5"
        stroke="currentColor"
        transition={{
          duration: randomDuration(0.4, 0.8),
          delay: randomDelay(0, 0.6),
        }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, scale: 1 }}
        width="126"
        x="705.5"
        y="0.5"
      />
      <motion.rect
        fill="none"
        height="126"
        initial={{ opacity: 0, scale: 0.8 }}
        rx="15.5"
        stroke="currentColor"
        transition={{
          duration: randomDuration(0.4, 0.8),
          delay: randomDelay(0, 0.6),
        }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, scale: 1 }}
        width="126"
        x="235.5"
        y="0.5"
      />
      <motion.rect
        fill="none"
        height="126"
        initial={{ opacity: 0, scale: 0.8 }}
        rx="15.5"
        stroke="currentColor"
        transition={{
          duration: randomDuration(0.4, 0.8),
          delay: randomDelay(0, 0.6),
        }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, scale: 1 }}
        width="126"
        x="940.5"
        y="0.5"
      />
      <motion.rect
        fill="none"
        height="126"
        initial={{ opacity: 0, scale: 0.8 }}
        rx="15.5"
        stroke="currentColor"
        transition={{
          duration: randomDuration(0.4, 0.8),
          delay: randomDelay(0, 0.6),
        }}
        viewport={{ once: true }}
        whileInView={{ opacity: 1, scale: 1 }}
        width="126"
        x="235.5"
        y="178.5"
      />

      {/* Connecting lines and paths */}
      <motion.path
        d="M298.278 304.584V304.584C298.278 368.097 349.765 419.584 413.278 419.584L470.278 419.584"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
      />
      <motion.path
        d="M768.279 305.415V305.415C768.279 368.928 716.792 420.415 653.279 420.415L597.279 420.415"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
      />
      <motion.line
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        x1="533.5"
        x2="533.5"
        y1="356"
        y2="305"
      />
      <motion.path
        d="M234.722 242.416L177.722 242.416C114.209 242.416 62.722 190.929 62.7219 127.416V127.416"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
      />
      <motion.path
        d="M1003.28 127.415V127.415C1003.28 190.928 951.792 242.415 888.279 242.415L832.279 242.415"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
      />
      <motion.line
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        x1="768.5"
        x2="768.5"
        y1="127"
        y2="178"
      />
      <motion.line
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        x1="533.5"
        x2="533.5"
        y1="127"
        y2="178"
      />
      <motion.line
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        x1="298.5"
        x2="298.5"
        y1="127"
        y2="178"
      />
      <motion.path
        d="M533.104 127.489C533.104 127.489 533.104 152.489 415.604 152.489C298.104 152.489 298.104 177.489 298.104 177.489"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
      />
      <motion.path
        d="M768.106 127.488C768.106 127.488 768.106 152.989 651.106 152.988C534.106 152.988 534.106 178.488 534.106 178.488"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        stroke="currentColor"
        strokeDasharray="2 2"
        transition={{
          duration: randomDuration(0.6, 1.2),
          delay: randomDelay(0.3, 1.0),
        }}
        viewport={{ once: true }}
        whileInView={{ pathLength: 1, opacity: 1 }}
      />
    </motion.svg>
  );
};
