import Image from "next/image";

type CampusClubLogoProps = {
  club: {
    slug: string;
    logoPath: string;
    logoAlt: string;
  };
};

export default function CampusClubLogo({ club }: CampusClubLogoProps) {
  const isMonochrome = club.slug === "petc";
  const dimensions = isMonochrome
    ? { width: 547, height: 451 }
    : { width: 576, height: 395 };

  return (
    <Image
      className={`campus-club-logo${isMonochrome ? " is-monochrome" : ""}`}
      src={club.logoPath}
      alt={club.logoAlt}
      width={dimensions.width}
      height={dimensions.height}
      priority
    />
  );
}
