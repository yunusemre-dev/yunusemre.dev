"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

import GitHub from "@/assets/socials/github.svg";
import LinkedIn from "@/assets/socials/linkedin.svg";
import Mail from "@/assets/socials/mail.svg";
import Yunus from "@/assets/yunus.jpg";
import PPMask from "@/assets/ppmask.png";

const socials: {
  name: string;
  icon: React.FC<React.SVGProps<SVGElement>>;
  link: string;
}[] = [
  {
    name: "GitHub",
    icon: GitHub,
    link: "https://github.com/yunusemre-dev",
  },
  {
    name: "LinkedIn",
    icon: LinkedIn,
    link: "https://www.linkedin.com/in/yekepenek/",
  },
  {
    name: "Mail",
    icon: Mail,
    link: "mailto:yunus.emre.kepenek@outlook.com",
  },
];

export default function Hero() {
  useEffect(() => {
    console.log(
      "Hey there! Looks like you found my secret. There you go, you deserve it: https://secret.yunusemre.dev/",
    );
  }, []);

  return (
    <header className="flex flex-shrink-0 flex-col justify-between pb-0 pt-10 md:pt-16 lg:sticky lg:top-0 lg:max-h-screen lg:pb-16">
      <section>
        <Image
          src={Yunus}
          width={288}
          height={288}
          priority
          quality={100}
          placeholder="blur"
          alt="Yunus Emre Kepenek"
          className="z-10 size-60 sm:size-72"
          style={{
            maskImage: `url(${PPMask.src})`,
            maskSize: "contain",
            maskRepeat: "no-repeat",
          }}
        />
        <div className="mt-10 text-skeptic-800">
          <h1 className="text-3xl font-bold tracking-tight">
            Yunus Emre Kepenek
          </h1>
          <h2 className="mt-1 text-xl tracking-tight">
            Full Stack Software Engineer
          </h2>
        </div>
        <nav
          className="mt-10 hidden lg:block"
          aria-label="Jump to related topic"
        >
          <ul className="block w-max">
            <li className="text-skeptic-900 transition-all hover:translate-x-2 hover:text-skeptic-700">
              <Link href={"#about"}>About</Link>
            </li>
            <li className="text-skeptic-900 transition-all hover:translate-x-2 hover:text-skeptic-700">
              <Link href={"#experience"}>Experience</Link>
            </li>
            <li className="text-skeptic-900 transition-all hover:translate-x-2 hover:text-skeptic-700">
              <Link href={"#projects"}>Projects</Link>
            </li>
          </ul>
        </nav>
      </section>

      <ul className="mt-6 flex gap-4" aria-label="Social media links">
        {socials.map((social, index) => (
          <li key={index}>
            <Link
              href={social.link}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={`Follow on ${social.name}`}
            >
              <social.icon className="size-6 fill-skeptic-800 hover:fill-skeptic-600" />
            </Link>
          </li>
        ))}
      </ul>
    </header>
  );
}
