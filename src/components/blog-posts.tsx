"use client";

import { useEffect, useState } from "react";
import Parser, { Item } from "rss-parser";
import Link from "next/link";
import Arrow from "@/assets/icons/arrow.svg";

export default function BlogPosts() {
  const parser = new Parser();

  const [posts, setPosts] = useState<({ [key: string]: any } & Item)[]>([]);

  useEffect(() => {
    parser
      .parseURL("https://blog.yunusemre.dev/rss.xml")
      .then((a) => setPosts(a.items.slice(0, 3)));
  }, []);

  return (
    posts.length > 0 &&
    parser && (
      <>
        <h2 className="text-2xl font-bold tracking-tight text-skeptic-900">
          Recent Blog Posts
        </h2>
        <ul className="mt-6 flex flex-col gap-5">
          {posts.map((post) => (
            <li
              className="group relative z-0 gap-4 rounded border bg-white p-4"
              key={post.guid}
            >
              <div
                className="absolute inset-0 -z-10 hidden rounded-md transition-all motion-reduce:transition-none lg:block lg:group-hover:-inset-3 lg:group-hover:bg-skeptic-200"
                aria-hidden="true"
              />
              <h3 className="font-bold leading-none">
                <Link
                  href={post.link || "/"}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <span>{post.title}</span>
                  <Arrow className="my-auto ml-1.5 inline-block size-3 stroke-[4px] transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  <span
                    className="absolute -inset-x-4 -inset-y-2.5 hidden rounded md:-inset-x-6 md:-inset-y-4 lg:block"
                    aria-hidden="true"
                  />
                </Link>
              </h3>
              <p className="mt-1 text-sm text-skeptic-800">
                {new Date(post.pubDate as string).toLocaleDateString("en-us", {
                  dateStyle: "medium",
                })}
              </p>
              <p className="mt-2 text-sm">{post.contentSnippet}</p>
            </li>
          ))}
        </ul>
      </>
    )
  );
}
