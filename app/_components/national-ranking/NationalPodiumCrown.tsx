import Image from "next/image";

import type { NationalRankingHonor } from "@/lib/nationalRanking/types";

type NationalPodiumCrownProps = {
  stage: NationalRankingHonor["stage"];
  decorative?: boolean;
  className?: string;
};

const crownByStage = {
  champion: {
    alt: "우승",
    src: "/national-ranking/gold-crown.png",
  },
  runner_up: {
    alt: "준우승",
    src: "/national-ranking/silver-crown.png",
  },
  semifinal: {
    alt: "4강",
    src: "/national-ranking/bronze-crown.png",
  },
} as const;

export default function NationalPodiumCrown({
  stage,
  decorative = false,
  className = "national-result-crown",
}: NationalPodiumCrownProps) {
  const crown = crownByStage[stage];

  return (
    <Image
      alt={decorative ? "" : crown.alt}
      className={className}
      height={18}
      src={crown.src}
      width={23}
    />
  );
}
