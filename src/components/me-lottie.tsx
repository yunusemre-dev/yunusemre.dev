"use client";

import React, { useEffect, useState } from "react";
import Lottie from "lottie-react";
import { cn } from "@/lib/utils";

import MeSvg from "@/assets/me.svg";
import PPMask from "@/assets/ppmask.png";
import GoneForGood from "@/assets/gone-for-good.svg";

import animationData from "@/assets/me.json";
import increasePokeCounter from "@/app/action";

const dialogs = [
  "Hello!",
  "Can you stop that please? It tickles...",
  "Hey, quit poking me!",
  "Seriously, do you mind?",
  "Okay, that’s enough now.",
  "Do you have nothing better to do?",
  "I’m starting to get annoyed.",
  "Why are you doing this?",
  "Please, no more poking.",
  "Can you find another button to press?",
  "You're testing my patience!",
  "I’m not a toy, you know.",
  "Would you stop if I asked nicely?",
  "This is not very professional.",
  "I'm about to lose my cool.",
  "Do I need to hide?",
  "Can we move on to something else?",
  "If I tell you my secret, will you stop?",
  "Is that what you want?",
  "Alright, take it and leave me be.",
  "secret.yunusemre.dev",
  "How you like that?",
  "Now, leave me alone.",
  "You know, this is quite distracting.",
  "Is there a point to this?",
  "You’re really persistent, aren’t you?",
  "I have other things to do!",
  "Please, have mercy!",
  "You’re not going to stop, are you?",
  "I won't run out of things to say.",
  "This is the last warning!",
  "You’re about to see my angry side.",
  "I’m begging you, please stop.",
  "Alright, I give up. You win.",
  "Just keep poking...",
  "You can't do this forever you know.",
  "Are you having fun?",
  "..",
  "...",
  "I can do this all day.",
  ".....",
  "......",
  "OKAY, you win. I give up.",
];

const CLICKS_TO_DIALOG = 6;

export default function MeLottie() {
  const [loaded, setLoaded] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [dialog, setDialog] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("angryYunus") === "true") setGone(true);
  }, []);

  useEffect(() => {
    if (clicks >= CLICKS_TO_DIALOG && !gone) {
      setDialog((prev) => prev + 1);
      setTimeout(() => {
        if (dialog === dialogs.length - 2) {
          setGone(true);
          localStorage.setItem("angryYunus", "true");
          return;
        }
        setClicks(0);
      }, 2000);
    }
  }, [clicks]);

  return (
    <div className="relative size-fit">
      <p
        className={cn(
          "text-skeptic-80 absolute z-0 w-max scale-75 opacity-0 transition-all max-sm:left-0 max-sm:max-w-56 sm:left-1/2 sm:top-0 sm:-translate-x-1/2 sm:whitespace-nowrap sm:text-center",
          clicks >= CLICKS_TO_DIALOG &&
            "scale-100 opacity-100 max-sm:left-[calc(100%+12px)] sm:-top-8",
          gone && "!opacity-0",
        )}
        aria-hidden="true"
      >
        {dialogs[dialog]}
      </p>
      <figure
        className="z-10 size-24 bg-skeptic-200 sm:size-32"
        style={{
          maskImage: `url(${PPMask.src})`,
          maskSize: "contain",
          maskRepeat: "no-repeat",
        }}
      >
        {loaded || (
          <MeSvg className="me-svg absolute size-24 translate-y-0.5 sm:size-32" />
        )}
        <Lottie
          className={cn(
            "change-bg z-10 origin-bottom translate-y-0.5 cursor-pointer select-none overflow-hidden transition-all",
            gone
              ? "translate-y-full rotate-2 duration-700"
              : "hover:translate-y-1 active:translate-y-1.5 active:rotate-1",
          )}
          animationData={animationData}
          onLoadedImages={() => setLoaded(true)}
          onClick={() => {
            if (clicks < CLICKS_TO_DIALOG && !gone) {
              setClicks((prev) => prev + 1);
              increasePokeCounter();
            }
          }}
          loop={true}
        />
        {gone && (
          <GoneForGood
            aria-hidden="true"
            className="animate-fade-up absolute bottom-7 left-0 right-0 -z-10 mx-auto size-16 sm:size-20"
          />
        )}
      </figure>
    </div>
  );
}
