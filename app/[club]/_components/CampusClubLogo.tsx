import Image from "next/image";

type CampusClubLogoProps = {
  club: {
    slug: string;
    logoPath: string;
    logoAlt: string;
  };
};

export default function CampusClubLogo({ club }: CampusClubLogoProps) {
  const className =
    club.slug === "petc"
      ? "campus-club-logo is-monochrome"
      : "campus-club-logo";

  return (
    <Image
      className={className}
      src={club.logoPath}
      alt={club.logoAlt}
      width={48}
      height={48}
      priority
    />
  );
}
