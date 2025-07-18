"use client";

import { Button } from "@/components/ui/button";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default function ButtonGroup() {
  // const { setChatOpen } = useContext(ChatContext);
  // const router = useRouter();

  return (
    <div className="mt-8 flex gap-4">
      {/* <Button
        asChild={false}
        size="sm"
        className="bg-skeptic-500 text-white hover:bg-skeptic-400"
        onClick={() => {
          setChatOpen(true);
          router.push("#chat");
        }}
      >
        <Sparkles aria-hidden className="mr-2 size-5 fill-current" /> Yunus AI
      </Button> */}
      <Button
        asChild
        size="sm"
        className="bg-skeptic-500 text-white hover:bg-skeptic-400"
      >
        <Link href="/resume.pdf" prefetch={false} target="_blank">
          Resume
          <ArrowUpRight className="ml-2 size-4" />
        </Link>
      </Button>
    </div>
  );
}
