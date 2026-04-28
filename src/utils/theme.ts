export type ThemePalette = {
  color: string;
  secondaryColor: string;
  glowColor: string;
  borderColor: string;
  gradient: string;
};

export const coachThemePalettes: ThemePalette[] = [
  {
    color: "#EF4444",
    secondaryColor: "#B91C1C",
    glowColor: "rgba(239,68,68,0.2)",
    borderColor: "#FCA5A5",
    gradient: "linear-gradient(145deg, #FEE2E2 0%, #F7F8FA 100%)",
  },
  {
    color: "#14B8A6",
    secondaryColor: "#0F766E",
    glowColor: "rgba(20,184,166,0.2)",
    borderColor: "#99F6E4",
    gradient: "linear-gradient(145deg, #D9FAF1 0%, #F7F8FA 100%)",
  },
  {
    color: "#F97316",
    secondaryColor: "#C2410C",
    glowColor: "rgba(249,115,22,0.2)",
    borderColor: "#FDBA74",
    gradient: "linear-gradient(145deg, #FFEDD5 0%, #F7F8FA 100%)",
  },
  {
    color: "#7C3AED",
    secondaryColor: "#5B21B6",
    glowColor: "rgba(124,58,237,0.2)",
    borderColor: "#C4B5FD",
    gradient: "linear-gradient(145deg, #EDE9FE 0%, #F7F8FA 100%)",
  },
];

export function pickRandomTheme(): ThemePalette {
  const index = Math.floor(Math.random() * coachThemePalettes.length);
  return coachThemePalettes[index];
}
