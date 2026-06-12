import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  CalendarDays,
  RotateCcw,
  Share2,
  Shuffle,
  Sparkles,
  Trophy,
} from "lucide-react";
import "./styles.css";

type GroupId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

type Team = {
  id: string;
  name: string;
  flag: string;
  group: GroupId;
  seed: number;
};

type MatchResult = {
  home?: number;
  away?: number;
  penaltiesHome?: number;
  penaltiesAway?: number;
};

type GroupMatch = {
  id: string;
  group: GroupId;
  home: string;
  away: string;
};

type Standing = {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
};

type KnockoutSlot =
  | { kind: "rank"; group: GroupId; rank: 1 | 2 }
  | { kind: "third"; groups: GroupId[] };

type KnockoutMatch = {
  id: number;
  round: "R32" | "R16" | "QF" | "SF" | "THIRD" | "FINAL";
  home: KnockoutSlot | { kind: "winner"; match: number } | { kind: "loser"; match: number };
  away: KnockoutSlot | { kind: "winner"; match: number } | { kind: "loser"; match: number };
};

type ShareMatchCard = {
  label: string;
  winner?: boolean;
  winnerSide?: "home" | "away";
  home: string;
  away: string;
  homeScore: string;
  awayScore: string;
  homeFlag?: string;
  awayFlag?: string;
};

type ShareRound = {
  label: string;
  accent: string;
  side?: "left" | "right" | "center";
  matches: ShareMatchCard[];
};

const savedPredictions: Array<{ id: string; name: string; createdAt: string; champion?: string }> = [];
const onLoadPrediction = (_entry: unknown) => {};
const onDeletePrediction = (_id: string) => {};

const ACTIVE_STORAGE_KEY = "worldcup-2026-simulator";

const hostByGroup: Record<GroupId, { label: string; tone: string }> = {
  A: { label: "México", tone: "mexico" },
  B: { label: "Canadá", tone: "canada" },
  C: { label: "Estados Unidos", tone: "usa" },
  D: { label: "Estados Unidos", tone: "usa" },
  E: { label: "Estados Unidos", tone: "usa" },
  F: { label: "Canadá / EE. UU.", tone: "canada" },
  G: { label: "Estados Unidos", tone: "usa" },
  H: { label: "Estados Unidos / México", tone: "mexico" },
  I: { label: "Canadá / EE. UU.", tone: "canada" },
  J: { label: "Estados Unidos", tone: "usa" },
  K: { label: "Estados Unidos / México", tone: "mexico" },
  L: { label: "Canadá / EE. UU.", tone: "usa" },
};

const groups: Record<GroupId, Team[]> = {
  A: [
    { id: "mex", name: "México", flag: "🇲🇽", group: "A", seed: 1 },
    { id: "rsa", name: "Sudáfrica", flag: "🇿🇦", group: "A", seed: 2 },
    { id: "kor", name: "Corea República", flag: "🇰🇷", group: "A", seed: 3 },
    { id: "cze", name: "Chequia", flag: "🇨🇿", group: "A", seed: 4 },
  ],
  B: [
    { id: "can", name: "Canadá", flag: "🇨🇦", group: "B", seed: 1 },
    { id: "bih", name: "Bosnia y Herzegovina", flag: "🇧🇦", group: "B", seed: 2 },
    { id: "qat", name: "Qatar", flag: "🇶🇦", group: "B", seed: 3 },
    { id: "sui", name: "Suiza", flag: "🇨🇭", group: "B", seed: 4 },
  ],
  C: [
    { id: "bra", name: "Brasil", flag: "🇧🇷", group: "C", seed: 1 },
    { id: "mar", name: "Marruecos", flag: "🇲🇦", group: "C", seed: 2 },
    { id: "hai", name: "Haití", flag: "🇭🇹", group: "C", seed: 3 },
    { id: "sco", name: "Escocia", flag: "🏴", group: "C", seed: 4 },
  ],
  D: [
    { id: "usa", name: "Estados Unidos", flag: "🇺🇸", group: "D", seed: 1 },
    { id: "par", name: "Paraguay", flag: "🇵🇾", group: "D", seed: 2 },
    { id: "aus", name: "Australia", flag: "🇦🇺", group: "D", seed: 3 },
    { id: "tur", name: "Turquía", flag: "🇹🇷", group: "D", seed: 4 },
  ],
  E: [
    { id: "ger", name: "Alemania", flag: "🇩🇪", group: "E", seed: 1 },
    { id: "cuw", name: "Curazao", flag: "🇨🇼", group: "E", seed: 2 },
    { id: "civ", name: "Costa de Marfil", flag: "🇨🇮", group: "E", seed: 3 },
    { id: "ecu", name: "Ecuador", flag: "🇪🇨", group: "E", seed: 4 },
  ],
  F: [
    { id: "ned", name: "Países Bajos", flag: "🇳🇱", group: "F", seed: 1 },
    { id: "jpn", name: "Japón", flag: "🇯🇵", group: "F", seed: 2 },
    { id: "swe", name: "Suecia", flag: "🇸🇪", group: "F", seed: 3 },
    { id: "tun", name: "Túnez", flag: "🇹🇳", group: "F", seed: 4 },
  ],
  G: [
    { id: "bel", name: "Bélgica", flag: "🇧🇪", group: "G", seed: 1 },
    { id: "egy", name: "Egipto", flag: "🇪🇬", group: "G", seed: 2 },
    { id: "irn", name: "Irán", flag: "🇮🇷", group: "G", seed: 3 },
    { id: "nzl", name: "Nueva Zelanda", flag: "🇳🇿", group: "G", seed: 4 },
  ],
  H: [
    { id: "esp", name: "España", flag: "🇪🇸", group: "H", seed: 1 },
    { id: "cpv", name: "Cabo Verde", flag: "🇨🇻", group: "H", seed: 2 },
    { id: "ksa", name: "Arabia Saudita", flag: "🇸🇦", group: "H", seed: 3 },
    { id: "uru", name: "Uruguay", flag: "🇺🇾", group: "H", seed: 4 },
  ],
  I: [
    { id: "fra", name: "Francia", flag: "🇫🇷", group: "I", seed: 1 },
    { id: "sen", name: "Senegal", flag: "🇸🇳", group: "I", seed: 2 },
    { id: "irq", name: "Iraq", flag: "🇮🇶", group: "I", seed: 3 },
    { id: "nor", name: "Noruega", flag: "🇳🇴", group: "I", seed: 4 },
  ],
  J: [
    { id: "arg", name: "Argentina", flag: "🇦🇷", group: "J", seed: 1 },
    { id: "alg", name: "Argelia", flag: "🇩🇿", group: "J", seed: 2 },
    { id: "aut", name: "Austria", flag: "🇦🇹", group: "J", seed: 3 },
    { id: "jor", name: "Jordania", flag: "🇯🇴", group: "J", seed: 4 },
  ],
  K: [
    { id: "por", name: "Portugal", flag: "🇵🇹", group: "K", seed: 1 },
    { id: "cod", name: "RD Congo", flag: "🇨🇩", group: "K", seed: 2 },
    { id: "uzb", name: "Uzbekistán", flag: "🇺🇿", group: "K", seed: 3 },
    { id: "col", name: "Colombia", flag: "🇨🇴", group: "K", seed: 4 },
  ],
  L: [
    { id: "eng", name: "Inglaterra", flag: "🏴", group: "L", seed: 1 },
    { id: "cro", name: "Croacia", flag: "🇭🇷", group: "L", seed: 2 },
    { id: "gha", name: "Ghana", flag: "🇬🇭", group: "L", seed: 3 },
    { id: "pan", name: "Panamá", flag: "🇵🇦", group: "L", seed: 4 },
  ],
};

const groupIds = Object.keys(groups) as GroupId[];
const teams = Object.values(groups).flat();
const teamById = new Map(teams.map((team) => [team.id, team]));
const shareFlagImageCache = new Map<string, HTMLImageElement>();
const fifaStrength: Record<string, { rank: number; points: number }> = {
  arg: { rank: 1, points: 1877 },
  esp: { rank: 2, points: 1875 },
  fra: { rank: 3, points: 1871 },
  eng: { rank: 4, points: 1828 },
  por: { rank: 5, points: 1768 },
  bra: { rank: 6, points: 1766 },
  mar: { rank: 7, points: 1755 },
  ned: { rank: 8, points: 1754 },
  bel: { rank: 9, points: 1742 },
  ger: { rank: 10, points: 1736 },
  cro: { rank: 11, points: 1715 },
  col: { rank: 13, points: 1698 },
  mex: { rank: 14, points: 1687 },
  sen: { rank: 15, points: 1684 },
  uru: { rank: 16, points: 1673 },
  usa: { rank: 17, points: 1668 },
  jpn: { rank: 18, points: 1662 },
  sui: { rank: 19, points: 1656 },
  irn: { rank: 20, points: 1635 },
  aut: { rank: 21, points: 1628 },
  kor: { rank: 22, points: 1588 },
  ecu: { rank: 23, points: 1583 },
  aus: { rank: 24, points: 1579 },
  tur: { rank: 26, points: 1568 },
  nor: { rank: 27, points: 1563 },
  swe: { rank: 29, points: 1549 },
  qat: { rank: 32, points: 1518 },
  egy: { rank: 34, points: 1510 },
  alg: { rank: 35, points: 1507 },
  tun: { rank: 41, points: 1478 },
  par: { rank: 43, points: 1469 },
  civ: { rank: 45, points: 1460 },
  can: { rank: 46, points: 1458 },
  sco: { rank: 48, points: 1452 },
  ksa: { rank: 55, points: 1419 },
  rsa: { rank: 57, points: 1405 },
  pan: { rank: 59, points: 1398 },
  cze: { rank: 60, points: 1396 },
  gha: { rank: 62, points: 1388 },
  bih: { rank: 65, points: 1372 },
  jor: { rank: 68, points: 1358 },
  irq: { rank: 69, points: 1354 },
  cpv: { rank: 70, points: 1350 },
  uzb: { rank: 72, points: 1344 },
  cod: { rank: 75, points: 1334 },
  nzl: { rank: 88, points: 1265 },
  hai: { rank: 89, points: 1261 },
  cuw: { rank: 90, points: 1258 },
};
const flagCodes: Record<string, string> = {
  mex: "mx",
  rsa: "za",
  kor: "kr",
  cze: "cz",
  can: "ca",
  bih: "ba",
  qat: "qa",
  sui: "ch",
  bra: "br",
  mar: "ma",
  hai: "ht",
  sco: "gb-sct",
  usa: "us",
  par: "py",
  aus: "au",
  tur: "tr",
  ger: "de",
  cuw: "cw",
  civ: "ci",
  ecu: "ec",
  ned: "nl",
  jpn: "jp",
  swe: "se",
  tun: "tn",
  bel: "be",
  egy: "eg",
  irn: "ir",
  nzl: "nz",
  esp: "es",
  cpv: "cv",
  ksa: "sa",
  uru: "uy",
  fra: "fr",
  sen: "sn",
  irq: "iq",
  nor: "no",
  arg: "ar",
  alg: "dz",
  aut: "at",
  jor: "jo",
  por: "pt",
  cod: "cd",
  uzb: "uz",
  col: "co",
  eng: "gb-eng",
  cro: "hr",
  gha: "gh",
  pan: "pa",
};

function createGroupMatches() {
  return groupIds.flatMap((group) => {
    const [a, b, c, d] = groups[group];
    return [
      { id: `${group}-1`, group, home: a.id, away: b.id },
      { id: `${group}-2`, group, home: c.id, away: d.id },
      { id: `${group}-3`, group, home: d.id, away: b.id },
      { id: `${group}-4`, group, home: a.id, away: c.id },
      { id: `${group}-5`, group, home: d.id, away: a.id },
      { id: `${group}-6`, group, home: b.id, away: c.id },
    ];
  });
}

const groupMatches = createGroupMatches();

const knockoutTemplate: KnockoutMatch[] = [
  { id: 73, round: "R32", home: { kind: "rank", group: "A", rank: 2 }, away: { kind: "rank", group: "B", rank: 2 } },
  { id: 74, round: "R32", home: { kind: "rank", group: "E", rank: 1 }, away: { kind: "third", groups: ["A", "B", "C", "D", "F"] } },
  { id: 75, round: "R32", home: { kind: "rank", group: "F", rank: 1 }, away: { kind: "rank", group: "C", rank: 2 } },
  { id: 76, round: "R32", home: { kind: "rank", group: "C", rank: 1 }, away: { kind: "rank", group: "F", rank: 2 } },
  { id: 77, round: "R32", home: { kind: "rank", group: "I", rank: 1 }, away: { kind: "third", groups: ["C", "D", "F", "G", "H"] } },
  { id: 78, round: "R32", home: { kind: "rank", group: "E", rank: 2 }, away: { kind: "rank", group: "I", rank: 2 } },
  { id: 79, round: "R32", home: { kind: "rank", group: "A", rank: 1 }, away: { kind: "third", groups: ["C", "E", "F", "H", "I"] } },
  { id: 80, round: "R32", home: { kind: "rank", group: "L", rank: 1 }, away: { kind: "third", groups: ["E", "H", "I", "J", "K"] } },
  { id: 81, round: "R32", home: { kind: "rank", group: "D", rank: 1 }, away: { kind: "third", groups: ["B", "E", "F", "I", "J"] } },
  { id: 82, round: "R32", home: { kind: "rank", group: "G", rank: 1 }, away: { kind: "third", groups: ["A", "E", "H", "I", "J"] } },
  { id: 83, round: "R32", home: { kind: "rank", group: "K", rank: 2 }, away: { kind: "rank", group: "L", rank: 2 } },
  { id: 84, round: "R32", home: { kind: "rank", group: "H", rank: 1 }, away: { kind: "rank", group: "J", rank: 2 } },
  { id: 85, round: "R32", home: { kind: "rank", group: "B", rank: 1 }, away: { kind: "third", groups: ["E", "F", "G", "I", "J"] } },
  { id: 86, round: "R32", home: { kind: "rank", group: "J", rank: 1 }, away: { kind: "rank", group: "H", rank: 2 } },
  { id: 87, round: "R32", home: { kind: "rank", group: "K", rank: 1 }, away: { kind: "third", groups: ["D", "E", "I", "J", "L"] } },
  { id: 88, round: "R32", home: { kind: "rank", group: "D", rank: 2 }, away: { kind: "rank", group: "G", rank: 2 } },
  { id: 89, round: "R16", home: { kind: "winner", match: 74 }, away: { kind: "winner", match: 77 } },
  { id: 90, round: "R16", home: { kind: "winner", match: 73 }, away: { kind: "winner", match: 75 } },
  { id: 91, round: "R16", home: { kind: "winner", match: 76 }, away: { kind: "winner", match: 78 } },
  { id: 92, round: "R16", home: { kind: "winner", match: 79 }, away: { kind: "winner", match: 80 } },
  { id: 93, round: "R16", home: { kind: "winner", match: 83 }, away: { kind: "winner", match: 84 } },
  { id: 94, round: "R16", home: { kind: "winner", match: 81 }, away: { kind: "winner", match: 82 } },
  { id: 95, round: "R16", home: { kind: "winner", match: 86 }, away: { kind: "winner", match: 88 } },
  { id: 96, round: "R16", home: { kind: "winner", match: 85 }, away: { kind: "winner", match: 87 } },
  { id: 97, round: "QF", home: { kind: "winner", match: 89 }, away: { kind: "winner", match: 90 } },
  { id: 98, round: "QF", home: { kind: "winner", match: 93 }, away: { kind: "winner", match: 94 } },
  { id: 99, round: "QF", home: { kind: "winner", match: 91 }, away: { kind: "winner", match: 92 } },
  { id: 100, round: "QF", home: { kind: "winner", match: 95 }, away: { kind: "winner", match: 96 } },
  { id: 101, round: "SF", home: { kind: "winner", match: 97 }, away: { kind: "winner", match: 98 } },
  { id: 102, round: "SF", home: { kind: "winner", match: 99 }, away: { kind: "winner", match: 100 } },
  { id: 103, round: "THIRD", home: { kind: "loser", match: 101 }, away: { kind: "loser", match: 102 } },
  { id: 104, round: "FINAL", home: { kind: "winner", match: 101 }, away: { kind: "winner", match: 102 } },
];

function App() {
  const [results, setResults] = useState<Record<string, MatchResult>>(() => {
    return readSharedPrediction() ?? readStorage<Record<string, MatchResult>>(ACTIVE_STORAGE_KEY, {});
  });
  const [sharePreviewUrl, setSharePreviewUrl] = useState<string>();
  const [shareBusy, setShareBusy] = useState(false);

  const standingsByGroup = useMemo(() => calculateAllStandings(results), [results]);
  const thirdRanking = useMemo(() => rankThirds(standingsByGroup), [standingsByGroup]);
  const thirdAssignments = useMemo(() => assignThirds(thirdRanking), [thirdRanking]);
  const knockoutResolved = useMemo(
    () => resolveKnockout(standingsByGroup, thirdAssignments, results),
    [standingsByGroup, thirdAssignments, results],
  );
  const shareRounds = useMemo(() => createShareRounds(knockoutResolved, results), [knockoutResolved, results]);

  const completedGroupMatches = groupMatches.filter((match) => isComplete(results[match.id])).length;
  const champion = knockoutResolved.find((match) => match.id === 104)?.winner;

  function persistResults(next: Record<string, MatchResult>) {
    setResults(next);
    localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(next));
  }

  function updateResult(id: string, patch: MatchResult) {
    const next = { ...results, [id]: { ...results[id], ...patch } };
    Object.keys(next[id]).forEach((key) => {
      if (next[id][key as keyof MatchResult] === undefined || Number.isNaN(next[id][key as keyof MatchResult])) {
        delete next[id][key as keyof MatchResult];
      }
    });
    persistResults(next);
  }

  function reset() {
    persistResults({});
  }

  function randomizeGroups() {
    const next = { ...results };
    groupMatches.forEach((match) => {
      next[match.id] = randomGroupResult(teamById.get(match.home)!, teamById.get(match.away)!);
    });
    persistResults(next);
  }

  function randomizeWorldCup() {
    const next: Record<string, MatchResult> = { ...results };
    groupMatches.forEach((match) => {
      next[match.id] = randomGroupResult(teamById.get(match.home)!, teamById.get(match.away)!);
    });

    const currentStandings = calculateAllStandings(next);
    const currentThirds = assignThirds(rankThirds(currentStandings));

    knockoutTemplate.forEach((match) => {
      const resolved = resolveKnockout(currentStandings, currentThirds, next).find((item) => item.id === match.id);
      if (!resolved?.homeTeam || !resolved.awayTeam) return;
      next[`K-${match.id}`] = randomKnockoutResult(resolved.homeTeam, resolved.awayTeam);
    });

    persistResults(next);
  }

  async function sharePrediction() {
    const encoded = encodeForHash(results);
    const url = `${window.location.origin}${window.location.pathname}#prediccion=${encoded}`;
    await navigator.clipboard.writeText(url);
  }

  async function createSharePreview() {
    const encoded = encodeForHash(results);
    const shareUrl = `${window.location.origin}${window.location.pathname}#prediccion=${encoded}`;
    setShareBusy(true);
    try {
      const blob = await renderShareImage({
        champion,
        predictionName: "Mi simulacion",
        shareUrl,
        rounds: shareRounds,
      });
      const objectUrl = URL.createObjectURL(blob);
      if (sharePreviewUrl) URL.revokeObjectURL(sharePreviewUrl);
      setSharePreviewUrl(objectUrl);
      return { blob, objectUrl, shareUrl };
    } finally {
      setShareBusy(false);
    }
  }

  async function shareOnFacebook() {
    const { blob, shareUrl } = await createSharePreview();
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(
      `Mi simulacion del Mundial 2026: ${champion?.name ?? "campeon por definir"}`,
    )}`;

    if (navigator.share && typeof File !== "undefined") {
      try {
        const file = new File([blob], "bracket-mundial-2026.png", { type: "image/png" });
        await navigator.share({
          title: "Mi simulacion del Mundial 2026",
          text: "Comparto mi bracket del Mundial 2026",
          files: [file],
        });
        return;
      } catch {
        // Fallback to Facebook web share below.
      }
    }

    window.open(facebookUrl, "_blank", "noopener,noreferrer,width=760,height=720");
  }

  return (
    <div className="app">
      <header className="hero">
        <div>
          <div className="eyebrow">
            <Trophy size={18} />
            FIFA World Cup 26
          </div>
          <h1>Simulador Mundial 2026</h1>
          <p>
            Ingresa marcadores, mira tablas en vivo, revisa los mejores terceros y completa el camino hasta la final.
          </p>
        </div>
        <div className="hero-card">
          <span>{completedGroupMatches}/72</span>
          <small>partidos de grupos simulados</small>
          {champion ? (
            <strong className="inline-team">
              <Flag team={champion} /> Campeón: {champion.name}
            </strong>
          ) : (
            <strong>Campeón pendiente</strong>
          )}
        </div>
      </header>

      <nav className="toolbar" aria-label="Acciones del simulador">
        <button onClick={randomizeGroups} className="tool-action">
          <Shuffle size={16} /> Simular grupos
        </button>
        <button onClick={randomizeWorldCup} className="tool-action highlight">
          <Sparkles size={16} /> Simular mundial
        </button>
        <button onClick={sharePrediction} className="tool-action">
          <Share2 size={16} /> Copiar enlace
        </button>
        <button onClick={shareOnFacebook} className="tool-action facebook-action">
          <Share2 size={16} /> Compartir
        </button>
        <button onClick={reset} className="danger">
          <RotateCcw size={16} /> Reiniciar
        </button>
      </nav>

      <main className="page-flow">
        {sharePreviewUrl ? (
          <SharePanel
            champion={champion}
            previewUrl={sharePreviewUrl}
            busy={shareBusy}
            onRefresh={createSharePreview}
            onClose={() => {
              URL.revokeObjectURL(sharePreviewUrl);
              setSharePreviewUrl(undefined);
            }}
          />
        ) : null}
        <section className="section-block">
          <SectionHeader title="Fase de grupos" kicker="12 grupos · 48 selecciones · 72 partidos" />
          <div className="groups-grid">
          {groupIds.map((group) => (
            <GroupCard
              key={group}
              group={group}
              standings={standingsByGroup[group]}
              matches={groupMatches.filter((match) => match.group === group)}
              results={results}
              onResult={updateResult}
              thirdRanking={thirdRanking}
            />
          ))}
          </div>
        </section>

        <ThirdsView ranking={thirdRanking} />
        <KnockoutView matches={knockoutResolved} results={results} onResult={updateResult} />
        <SummaryView
          standingsByGroup={standingsByGroup}
          thirdRanking={thirdRanking}
          knockout={knockoutResolved}
          champion={champion}
          groupProgress={completedGroupMatches}
        />
      </main>
    </div>
  );
}

function SectionHeader({ title, kicker }: { title: string; kicker: string }) {
  return (
    <div className="section-head">
      <div>
        <span>{kicker}</span>
        <h2>{title}</h2>
      </div>
    </div>
  );
}

function SharePanel({
  champion,
  previewUrl,
  busy,
  onRefresh,
  onClose,
}: {
  champion?: Team;
  previewUrl: string;
  busy: boolean;
  onRefresh: () => Promise<unknown>;
  onClose: () => void;
}) {
  return (
    <section className="share-panel">
      <div className="share-copy">
        <span>Facebook</span>
        <h2>Bracket listo para compartir</h2>
        <p>
          Generamos una version mas limpia del bracket para publicar. Si tu telefono soporta compartir archivos,
          se adjunta la imagen directamente; si no, se abre Facebook con el enlace de la simulacion.
        </p>
        <strong>{champion ? `Campeon: ${champion.name}` : "Completa la final para coronar un campeon"}</strong>
      </div>
      <img className="share-preview" src={previewUrl} alt="Vista previa del bracket para compartir" />
      <div className="share-actions">
        <button className="tool-action" onClick={() => void onRefresh()} disabled={busy}>
          {busy ? "Generando..." : "Actualizar imagen"}
        </button>
        <a className="tool-action" href={previewUrl} download="bracket-mundial-2026.png">
          Descargar PNG
        </a>
        <button className="danger" onClick={onClose}>Cerrar</button>
      </div>
    </section>
  );
}

function Flag({ team }: { team: Team }) {
  const code = flagCodes[team.id];
  if (!code) return <span className="flag-fallback">{team.flag}</span>;
  return (
    <img
      className="flag-img"
      src={`https://flagcdn.com/w80/${code}.png`}
      srcSet={`https://flagcdn.com/w40/${code}.png 1x, https://flagcdn.com/w80/${code}.png 2x`}
      alt={`Bandera de ${team.name}`}
      loading="lazy"
      crossOrigin="anonymous"
    />
  );
}

function TeamLabel({ team }: { team: Team }) {
  const strength = fifaStrength[team.id];
  return (
    <span className="team-label" title={strength ? `Ranking FIFA ${strength.rank} · ${strength.points} pts` : undefined}>
      <Flag team={team} />
      <span>{team.name}</span>
    </span>
  );
}

function GroupCard({
  group,
  standings,
  matches,
  results,
  onResult,
  thirdRanking,
}: {
  group: GroupId;
  standings: Standing[];
  matches: GroupMatch[];
  results: Record<string, MatchResult>;
  onResult: (id: string, patch: MatchResult) => void;
  thirdRanking: Standing[];
}) {
  const completed = matches.filter((match) => isComplete(results[match.id])).length;
  const thirdState = thirdRanking.findIndex((row) => row.team.id === standings[2].team.id);
  return (
    <section className={`group-card ${hostByGroup[group].tone}`}>
      <div className="group-head">
        <div>
          <h2>Grupo {group}</h2>
          <span>{hostByGroup[group].label}</span>
        </div>
        <small>{completed}/6 jugados</small>
      </div>
      <table className="standings">
        <thead>
          <tr>
            <th>Eq.</th>
            <th>PJ</th>
            <th>DG</th>
            <th>Pts</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, index) => (
            <tr key={row.team.id} className={index < 2 ? "qualified" : index === 2 && thirdState < 8 ? "third-ok" : ""}>
              <td>
                <span>{index + 1}</span> <TeamLabel team={row.team} />
              </td>
              <td>{row.played}</td>
              <td>{formatSigned(row.goalDifference)}</td>
              <td><strong>{row.points}</strong></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="matches">
        {matches.map((match) => {
          const home = teamById.get(match.home)!;
          const away = teamById.get(match.away)!;
          const result = results[match.id] ?? {};
          return (
            <div className="match-row" key={match.id}>
              <TeamLabel team={home} />
              <ScoreInput value={result.home} onChange={(homeScore) => onResult(match.id, { home: homeScore })} label={`${home.name} goles`} />
              <span className="match-separator" aria-hidden="true">-</span>
              <ScoreInput value={result.away} onChange={(awayScore) => onResult(match.id, { away: awayScore })} label={`${away.name} goles`} />
              <TeamLabel team={away} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ThirdsView({ ranking }: { ranking: Standing[] }) {
  return (
    <main className="panel">
      <div className="panel-head">
        <div>
          <h2>Ranking de mejores terceros</h2>
          <p>Avanzan los 8 mejores terceros entre los 12 grupos, como marca el formato 2026.</p>
        </div>
        <CalendarDays size={28} />
      </div>
      <div className="third-list">
        {ranking.map((row, index) => (
          <div className={`third-row ${index < 8 ? "advance" : "out"}`} key={row.team.id}>
            <strong>{index + 1}</strong>
            <TeamLabel team={row.team} />
            <span>Grupo {row.team.group}</span>
            <span>{row.points} pts</span>
            <span>DG {formatSigned(row.goalDifference)}</span>
            <em>{index < 8 ? "Clasifica" : "Eliminado"}</em>
          </div>
        ))}
      </div>
    </main>
  );
}

function KnockoutView({
  matches,
  results,
  onResult,
}: {
  matches: ReturnType<typeof resolveKnockout>;
  results: Record<string, MatchResult>;
  onResult: (id: string, patch: MatchResult) => void;
}) {
  const leftRounds = [
    { label: "16vos Lado A", ids: [74, 77, 73, 75, 83, 84, 81, 82] },
    { label: "Octavos", ids: [89, 90, 93, 94] },
    { label: "Cuartos", ids: [97, 98] },
    { label: "Semifinal", ids: [101] },
  ];
  const rightRounds = [
    { label: "Semifinal", ids: [102] },
    { label: "Cuartos", ids: [99, 100] },
    { label: "Octavos", ids: [91, 92, 95, 96] },
    { label: "16vos Lado B", ids: [76, 78, 79, 80, 86, 88, 85, 87] },
  ];
  const final = matches.find((match) => match.id === 104)!;
  const third = matches.find((match) => match.id === 103)!;
  const byId = new Map(matches.map((match) => [match.id, match]));
  return (
    <section className="section-block">
      <SectionHeader title="Bracket de eliminatorias" kicker="Round of 32 · octavos · cuartos · semifinales · final" />
      <div className="notice">
        <Sparkles size={18} />
        Los cruces base siguen el calendario FIFA. Los cupos “mejor tercero” muestran grupos elegibles; la app los asigna de forma provisional para poder simular, porque el reparto oficial depende de la matriz FIFA al cerrar la fase de grupos.
      </div>
      <main className="bracket-stage">
        <div className="bracket-side left">
          {leftRounds.map((round) => (
            <BracketRound key={round.label} label={round.label} ids={round.ids} byId={byId} results={results} onResult={onResult} />
          ))}
        </div>
        <div className="final-lane">
          <KnockoutMatchCard match={third} result={results[`K-${third.id}`] ?? {}} onResult={onResult} featuredLabel="Tercer puesto" />
          <div className={`champion-mark ${final.winner ? "celebrating" : ""}`}>
            {final.winner ? (
              <>
                <div className="confetti confetti-left" aria-hidden="true" />
                <div className="confetti confetti-right" aria-hidden="true" />
              </>
            ) : null}
            <Trophy size={34} />
            <span>Campeón</span>
            <strong>{final.winner ? <TeamLabel team={final.winner} /> : "Por definir"}</strong>
          </div>
          <KnockoutMatchCard match={final} result={results[`K-${final.id}`] ?? {}} onResult={onResult} featuredLabel="Final" />
        </div>
        <div className="bracket-side right">
          {rightRounds.map((round) => (
            <BracketRound key={round.label} label={round.label} ids={round.ids} byId={byId} results={results} onResult={onResult} />
          ))}
        </div>
      </main>
    </section>
  );
}

function BracketRound({
  label,
  ids,
  byId,
  results,
  onResult,
}: {
  label: string;
  ids: number[];
  byId: Map<number, ReturnType<typeof resolveKnockout>[number]>;
  results: Record<string, MatchResult>;
  onResult: (id: string, patch: MatchResult) => void;
}) {
  return (
    <section className="bracket-round">
      <h3>{label}</h3>
      <div className="round-stack" style={{ "--match-count": ids.length } as React.CSSProperties}>
        {ids.map((id) => {
          const match = byId.get(id)!;
          return (
            <KnockoutMatchCard
              key={id}
              match={match}
              result={results[`K-${match.id}`] ?? {}}
              onResult={onResult}
            />
          );
        })}
      </div>
    </section>
  );
}

function KnockoutMatchCard({
  match,
  result,
  onResult,
  featuredLabel,
}: {
  match: ReturnType<typeof resolveKnockout>[number];
  result: MatchResult;
  onResult: (id: string, patch: MatchResult) => void;
  featuredLabel?: string;
}) {
  return (
    <article className={`ko-card ${match.winner ? "done" : ""}`}>
      {featuredLabel ? <div className="ko-title">{featuredLabel}</div> : null}
      <div className="ko-team">
        <span>{renderTeam(match.homeTeam, match.homeLabel)}</span>
        <ScoreInput value={result.home} onChange={(home) => onResult(`K-${match.id}`, { home })} label="Goles local" />
      </div>
      <div className="ko-team">
        <span>{renderTeam(match.awayTeam, match.awayLabel)}</span>
        <ScoreInput value={result.away} onChange={(away) => onResult(`K-${match.id}`, { away })} label="Goles visitante" />
      </div>
      {result.home !== undefined && result.away !== undefined && result.home === result.away && (
        <div className="penalties">
          <span>Penales</span>
          <ScoreInput value={result.penaltiesHome} onChange={(penaltiesHome) => onResult(`K-${match.id}`, { penaltiesHome })} label="Penales local" />
          <ScoreInput value={result.penaltiesAway} onChange={(penaltiesAway) => onResult(`K-${match.id}`, { penaltiesAway })} label="Penales visitante" />
        </div>
      )}
      <small>{match.winner ? `Avanza ${match.winner.name}` : "Pendiente"}</small>
    </article>
  );
}

function SummaryView({
  standingsByGroup,
  thirdRanking,
  knockout,
  champion,
  groupProgress,
}: {
  standingsByGroup: Record<GroupId, Standing[]>;
  thirdRanking: Standing[];
  knockout: ReturnType<typeof resolveKnockout>;
  champion?: Team;
  groupProgress: number;
}) {
  const final = knockout.find((match) => match.id === 104);
  return (
    <main className="summary">
      <section className={`podium ${champion ? "is-champion" : ""}`}>
        {champion ? (
          <>
            <div className="confetti confetti-left" aria-hidden="true" />
            <div className="confetti confetti-right" aria-hidden="true" />
            <div className="winner-flag-wrap" aria-hidden="true">
              <Flag team={champion} />
            </div>
          </>
        ) : null}
        <Trophy size={46} />
        <h2>{champion ? <TeamLabel team={champion} /> : "Campeón pendiente"}</h2>
        <p>Final: {final?.homeTeam?.name ?? final?.homeLabel} vs {final?.awayTeam?.name ?? final?.awayLabel}</p>
      </section>
      <section className="stat-grid">
        <div><strong>{groupProgress}</strong><span>partidos de grupo</span></div>
        <div><strong>{thirdRanking.slice(0, 8).length}</strong><span>mejores terceros</span></div>
        <div><strong>{knockout.filter((match) => match.winner).length}</strong><span>eliminatorias definidas</span></div>
      </section>
      <section className="panel compact">
        <h2>Ganadores de grupo</h2>
        <div className="winners">
          {groupIds.map((group) => (
            <span key={group}>Grupo {group}: <TeamLabel team={standingsByGroup[group][0].team} /></span>
          ))}
        </div>
      </section>
      {false ? <section className="panel compact">
        <h2>Predicciones guardadas</h2>
        {savedPredictions.length === 0 ? (
          <p className="muted">Todavia no hay predicciones guardadas en este navegador.</p>
        ) : (
          <div className="saved-list">
            {savedPredictions.map((entry) => (
              <div className="saved-row" key={entry.id}>
                <div>
                  <strong>{entry.name}</strong>
                  <span>
                    {new Date(entry.createdAt).toLocaleString()} · Campeon: {entry.champion ?? "pendiente"}
                  </span>
                </div>
                <button onClick={() => onLoadPrediction(entry)}>Cargar</button>
                <button className="danger-inline" onClick={() => onDeletePrediction(entry.id)}>
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </section> : null}
    </main>
  );
}

function ScoreInput({ value, onChange, label }: { value?: number; onChange: (value?: number) => void; label: string }) {
  return (
    <input
      aria-label={label}
      type="number"
      min="0"
      max="30"
      value={value ?? ""}
      onChange={(event) => {
        const raw = event.target.value;
        onChange(raw === "" ? undefined : Math.max(0, Math.min(30, Number(raw))));
      }}
    />
  );
}

function calculateAllStandings(results: Record<string, MatchResult>) {
  return Object.fromEntries(groupIds.map((group) => [group, calculateStandings(group, results)])) as Record<GroupId, Standing[]>;
}

function calculateStandings(group: GroupId, results: Record<string, MatchResult>) {
  const table = new Map<string, Standing>();
  groups[group].forEach((team) => {
    table.set(team.id, {
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    });
  });
  groupMatches.filter((match) => match.group === group).forEach((match) => {
    const result = results[match.id];
    if (!isComplete(result)) return;
    const home = table.get(match.home)!;
    const away = table.get(match.away)!;
    applyResult(home, result.home!, result.away!);
    applyResult(away, result.away!, result.home!);
  });
  return Array.from(table.values()).sort((a, b) => compareGroupStandings(a, b, group, results));
}

function applyResult(row: Standing, goalsFor: number, goalsAgainst: number) {
  row.played += 1;
  row.goalsFor += goalsFor;
  row.goalsAgainst += goalsAgainst;
  row.goalDifference = row.goalsFor - row.goalsAgainst;
  if (goalsFor > goalsAgainst) {
    row.won += 1;
    row.points += 3;
  } else if (goalsFor === goalsAgainst) {
    row.drawn += 1;
    row.points += 1;
  } else {
    row.lost += 1;
  }
}

function compareGroupStandings(a: Standing, b: Standing, group: GroupId, results: Record<string, MatchResult>) {
  const overall = compareStandingNumbers(a, b);
  if (overall !== 0) return overall;
  const headToHead = compareHeadToHead(a.team.id, b.team.id, group, results);
  return headToHead || a.team.seed - b.team.seed;
}

function compareStandingNumbers(a: Standing, b: Standing) {
  return (
    b.points - a.points ||
    b.goalDifference - a.goalDifference ||
    b.goalsFor - a.goalsFor
  );
}

function compareStandings(a: Standing, b: Standing) {
  return compareStandingNumbers(a, b) || a.team.seed - b.team.seed;
}

function compareHeadToHead(teamA: string, teamB: string, group: GroupId, results: Record<string, MatchResult>) {
  const rows = new Map<string, { points: number; goalDifference: number; goalsFor: number }>([
    [teamA, { points: 0, goalDifference: 0, goalsFor: 0 }],
    [teamB, { points: 0, goalDifference: 0, goalsFor: 0 }],
  ]);
  groupMatches
    .filter(
      (match) =>
        match.group === group &&
        ((match.home === teamA && match.away === teamB) || (match.home === teamB && match.away === teamA)),
    )
    .forEach((match) => {
      const result = results[match.id];
      if (!isComplete(result)) return;
      const home = rows.get(match.home)!;
      const away = rows.get(match.away)!;
      home.goalsFor += result.home;
      away.goalsFor += result.away;
      home.goalDifference += result.home - result.away;
      away.goalDifference += result.away - result.home;
      if (result.home > result.away) home.points += 3;
      if (result.away > result.home) away.points += 3;
      if (result.home === result.away) {
        home.points += 1;
        away.points += 1;
      }
    });
  const a = rows.get(teamA)!;
  const b = rows.get(teamB)!;
  return b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor;
}

function rankThirds(standingsByGroup: Record<GroupId, Standing[]>) {
  return groupIds.map((group) => standingsByGroup[group][2]).sort(compareStandings);
}

function assignThirds(thirdRanking: Standing[]) {
  const qualified = thirdRanking.slice(0, 8);
  const used = new Set<string>();
  const assignments = new Map<string, Team>();
  const thirdSlots = knockoutTemplate
    .filter((match) => match.round === "R32")
    .flatMap((match) => [match.home, match.away])
    .filter((slot): slot is { kind: "third"; groups: GroupId[] } => slot.kind === "third");

  thirdSlots.forEach((slot) => {
    const candidate = qualified.find((row) => slot.groups.includes(row.team.group) && !used.has(row.team.id));
    if (candidate) {
      assignments.set(slot.groups.join("/"), candidate.team);
      used.add(candidate.team.id);
    }
  });

  thirdSlots.forEach((slot) => {
    const key = slot.groups.join("/");
    if (assignments.has(key)) return;
    const fallback = qualified.find((row) => !used.has(row.team.id));
    if (fallback) {
      assignments.set(key, fallback.team);
      used.add(fallback.team.id);
    }
  });
  return assignments;
}

function resolveKnockout(
  standingsByGroup: Record<GroupId, Standing[]>,
  thirdAssignments: Map<string, Team>,
  results: Record<string, MatchResult>,
) {
  const winnerByMatch = new Map<number, Team>();
  const loserByMatch = new Map<number, Team>();
  return knockoutTemplate.map((match) => {
    const homeTeam = resolveSlot(match.home, standingsByGroup, thirdAssignments, winnerByMatch, loserByMatch);
    const awayTeam = resolveSlot(match.away, standingsByGroup, thirdAssignments, winnerByMatch, loserByMatch);
    const result = results[`K-${match.id}`];
    const winner = resolveWinner(homeTeam, awayTeam, result);
    const loser = winner && homeTeam && awayTeam ? (winner.id === homeTeam.id ? awayTeam : homeTeam) : undefined;
    if (winner) winnerByMatch.set(match.id, winner);
    if (loser) loserByMatch.set(match.id, loser);
    return {
      ...match,
      homeTeam,
      awayTeam,
      homeLabel: slotLabel(match.home),
      awayLabel: slotLabel(match.away),
      winner,
    };
  });
}

function resolveSlot(
  slot: KnockoutMatch["home"],
  standingsByGroup: Record<GroupId, Standing[]>,
  thirdAssignments: Map<string, Team>,
  winnerByMatch: Map<number, Team>,
  loserByMatch: Map<number, Team>,
) {
  if (slot.kind === "rank") return standingsByGroup[slot.group][slot.rank - 1].team;
  if (slot.kind === "third") return thirdAssignments.get(slot.groups.join("/"));
  if (slot.kind === "winner") return winnerByMatch.get(slot.match);
  return loserByMatch.get(slot.match);
}

function slotLabel(slot: KnockoutMatch["home"]) {
  if (slot.kind === "rank") return `${slot.rank}.${slot.group}`;
  if (slot.kind === "third") return `3° ${slot.groups.join("/")}`;
  if (slot.kind === "winner") return `Ganador ${slot.match}`;
  return `Perdedor ${slot.match}`;
}

function resolveWinner(home?: Team, away?: Team, result?: MatchResult) {
  if (!home || !away || !isComplete(result)) return undefined;
  if (result.home! > result.away!) return home;
  if (result.away! > result.home!) return away;
  if (result.penaltiesHome === undefined || result.penaltiesAway === undefined) return undefined;
  if (result.penaltiesHome === result.penaltiesAway) return undefined;
  return result.penaltiesHome > result.penaltiesAway ? home : away;
}

function renderTeam(team?: Team, fallback?: string) {
  return team ? <TeamLabel team={team} /> : fallback ?? "Por definir";
}

function isComplete(result?: MatchResult): result is Required<Pick<MatchResult, "home" | "away">> & MatchResult {
  return result?.home !== undefined && result?.away !== undefined;
}

function randomGroupResult(homeTeam: Team, awayTeam: Team): MatchResult {
  const { home, away } = simulateScore(homeTeam, awayTeam);
  return { home, away };
}

function randomKnockoutResult(homeTeam: Team, awayTeam: Team): MatchResult {
  const { home, away, homeWinProbability } = simulateScore(homeTeam, awayTeam);
  if (home !== away) return { home, away };
  const homeWins = Math.random() < homeWinProbability;
  const loserPens = 2 + Math.floor(Math.random() * 4);
  return {
    home,
    away,
    penaltiesHome: homeWins ? loserPens + 1 : loserPens,
    penaltiesAway: homeWins ? loserPens : loserPens + 1,
  };
}

function simulateScore(homeTeam: Team, awayTeam: Team) {
  const homeRating = fifaStrength[homeTeam.id]?.points ?? 1300;
  const awayRating = fifaStrength[awayTeam.id]?.points ?? 1300;
  const diff = homeRating - awayRating;
  const homeWinProbability = 1 / (1 + Math.pow(10, -diff / 420));
  const strengthSwing = clamp(diff / 260, -1.15, 1.15);
  const homeLambda = clamp(1.18 + strengthSwing * 0.52, 0.35, 3.1);
  const awayLambda = clamp(1.18 - strengthSwing * 0.52, 0.35, 3.1);
  return {
    home: poisson(homeLambda),
    away: poisson(awayLambda),
    homeWinProbability,
  };
}

function poisson(lambda: number) {
  const limit = Math.exp(-lambda);
  let product = 1;
  let goals = 0;
  do {
    goals += 1;
    product *= Math.random();
  } while (product > limit);
  return Math.min(8, goals - 1);
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatSigned(value: number) {
  return value > 0 ? `+${value}` : `${value}`;
}

function readStorage<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function downloadJson(filename: string, payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function encodeForHash(results: Record<string, MatchResult>) {
  const json = JSON.stringify(results);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function decodeFromHash(value: string) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes)) as Record<string, MatchResult>;
}

function readSharedPrediction() {
  const marker = "#prediccion=";
  if (!window.location.hash.startsWith(marker)) return undefined;
  try {
    const results = decodeFromHash(window.location.hash.slice(marker.length));
    localStorage.setItem(ACTIVE_STORAGE_KEY, JSON.stringify(results));
    history.replaceState(null, "", window.location.pathname);
    return results;
  } catch {
    return undefined;
  }
}

function createShareRounds(matches: ReturnType<typeof resolveKnockout>, results: Record<string, MatchResult>) {
  const definitions = [
    { label: "Dieciseisavos", accent: "#3b82f6", side: "left" as const, ids: [74, 77, 73, 75, 83, 84, 81, 82] },
    { label: "Octavos", accent: "#60a5fa", side: "left" as const, ids: [89, 90, 93, 94] },
    { label: "Cuartos", accent: "#818cf8", side: "left" as const, ids: [97, 98] },
    { label: "Semifinal", accent: "#f59e0b", side: "left" as const, ids: [101] },
    { label: "Semifinal", accent: "#f59e0b", side: "right" as const, ids: [102] },
    { label: "Cuartos", accent: "#818cf8", side: "right" as const, ids: [99, 100] },
    { label: "Octavos", accent: "#60a5fa", side: "right" as const, ids: [91, 92, 95, 96] },
    { label: "Dieciseisavos", accent: "#3b82f6", side: "right" as const, ids: [76, 78, 79, 80, 86, 88, 85, 87] },
    { label: "Finales", accent: "#f43f5e", side: "center" as const, ids: [103, 104] },
  ];
  const byId = new Map(matches.map((match) => [match.id, match]));
  return definitions.map((round) => ({
    label: round.label,
    accent: round.accent,
    side: round.side,
    matches: round.ids
      .map((id) => byId.get(id))
      .filter((match): match is NonNullable<typeof match> => Boolean(match))
      .map((match) => {
        const result = results[`K-${match.id}`];
        return {
          label: match.id === 103 ? "Tercer puesto" : match.id === 104 ? "Final" : "",
          winner: Boolean(match.winner),
          winnerSide: getWinnerSide(match),
          home: match.homeTeam?.name ?? match.homeLabel,
          away: match.awayTeam?.name ?? match.awayLabel,
          homeScore: result?.home?.toString() ?? "-",
          awayScore: result?.away?.toString() ?? "-",
          homeFlag: match.homeTeam?.id ? flagCodes[match.homeTeam.id] : undefined,
          awayFlag: match.awayTeam?.id ? flagCodes[match.awayTeam.id] : undefined,
        };
      }),
  }));
}

function getWinnerSide(match: ReturnType<typeof resolveKnockout>[number]): ShareMatchCard["winnerSide"] {
  if (match.winner?.id === match.homeTeam?.id) return "home";
  if (match.winner?.id === match.awayTeam?.id) return "away";
  return undefined;
}

async function renderShareImage({
  champion,
  predictionName,
  shareUrl,
  rounds,
}: {
  champion?: Team;
  predictionName: string;
  shareUrl: string;
  rounds: ShareRound[];
}) {
  await preloadShareFlags(rounds, champion);
  const canvas = document.createElement("canvas");
  canvas.width = 1800;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo generar la imagen");

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "#071018");
  gradient.addColorStop(0.5, "#0c1b28");
  gradient.addColorStop(1, "#08131e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(56,189,248,0.08)";
  ctx.beginPath();
  ctx.arc(180, 120, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(244,63,94,0.08)";
  ctx.beginPath();
  ctx.arc(1620, 160, 240, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f8fafc";
  ctx.font = "900 48px Arial";
  ctx.fillText("Mi bracket del Mundial 2026", 56, 74);
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "700 24px Arial";
  ctx.fillText(trimCanvasText(ctx, predictionName.trim() || "Mi prediccion", 520), 56, 108);

  drawRoundedRect(ctx, 1225, 38, 520, 98, 22);
  ctx.fillStyle = "rgba(251,191,36,0.12)";
  ctx.fill();
  ctx.strokeStyle = "rgba(251,191,36,0.38)";
  ctx.stroke();
  ctx.fillStyle = "#fbbf24";
  ctx.font = "900 21px Arial";
  ctx.fillText("CAMPEON", 1252, 74);
  ctx.fillStyle = "#ffffff";
  ctx.font = "900 36px Arial";
  ctx.fillText(trimCanvasText(ctx, champion?.name ?? "Por definir", 450), 1252, 114);

  const leftRounds = rounds.filter((round) => round.side === "left");
  const rightRounds = rounds.filter((round) => round.side === "right");
  const centerRounds = rounds.filter((round) => round.side === "center");

  const laneTop = 190;
  const cardWidth = 178;
  const cardHeight = 76;
  const leftXs = [56, 278, 500, 722];
  const rightXs = [1022, 1238, 1454, 1566];
  const centerX = 836;

  leftRounds.forEach((round, index) => {
    drawShareRound(ctx, round, leftXs[index], laneTop, cardWidth, cardHeight, "left");
  });
  rightRounds.forEach((round, index) => {
    drawShareRound(ctx, round, rightXs[index], laneTop, cardWidth, cardHeight, "right");
  });

  const thirdPlace = centerRounds[0]?.matches[0];
  const finalMatch = centerRounds[0]?.matches[1];

  if (thirdPlace) {
    drawMatchCard(ctx, thirdPlace, centerX, 312, 220, 84, "#64748b", "center");
  }

  drawChampionBadge(ctx, champion, centerX + 10, 468, 200, 150);

  if (finalMatch) {
    drawMatchCard(ctx, finalMatch, centerX, 694, 220, 92, "#fbbf24", "center");
  }

  drawRoundedRect(ctx, 56, 964, 1688, 72, 20);
  ctx.fillStyle = "rgba(15,23,42,0.82)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148,163,184,0.22)";
  ctx.stroke();
  ctx.fillStyle = "#cbd5e1";
  ctx.font = "700 20px Arial";
  ctx.fillText(trimCanvasText(ctx, shareUrl, 1580), 84, 1008);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
  if (!blob) throw new Error("No se pudo exportar la imagen");
  return blob;
}

async function preloadShareFlags(rounds: ShareRound[], champion?: Team) {
  const codes = new Set<string>();
  rounds.forEach((round) => {
    round.matches.forEach((match) => {
      if (match.homeFlag) codes.add(match.homeFlag);
      if (match.awayFlag) codes.add(match.awayFlag);
    });
  });
  if (champion?.id) {
    const code = flagCodes[champion.id];
    if (code) codes.add(code);
  }
  await Promise.all(Array.from(codes).map(loadShareFlag));
}

async function loadShareFlag(code: string) {
  if (shareFlagImageCache.has(code)) return shareFlagImageCache.get(code)!;
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`No se pudo cargar la bandera ${code}`));
    img.src = `https://flagcdn.com/w80/${code}.png`;
  });
  shareFlagImageCache.set(code, image);
  return image;
}

function drawMatchCard(
  ctx: CanvasRenderingContext2D,
  match: ShareMatchCard,
  x: number,
  y: number,
  width: number,
  height: number,
  accent: string,
  align: "left" | "right" | "center" = "left",
) {
  drawRoundedRect(ctx, x, y, width, height, 16);
  ctx.fillStyle = match.winner ? "rgba(16, 185, 129, 0.12)" : "rgba(15,23,42,0.9)";
  ctx.fill();
  ctx.strokeStyle = match.winner ? "rgba(16, 185, 129, 0.4)" : "rgba(255,255,255,0.12)";
  ctx.stroke();
  const accentX = align === "right" ? x + width - 8 : x;
  drawRoundedRect(ctx, accentX, y, 8, height, 16);
  ctx.fillStyle = accent;
  ctx.fill();
  if (match.label) {
    ctx.fillStyle = "#94a3b8";
    ctx.font = "800 14px Arial";
    ctx.fillText(match.label, x + 18, y + 18);
  }
  drawShareTeamRow(ctx, match.home, match.homeFlag, match.winnerSide === "home", x, y + 22, width);
  drawShareTeamRow(ctx, match.away, match.awayFlag, match.winnerSide === "away", x, y + 46, width);
  ctx.fillStyle = "#fbbf24";
  ctx.textAlign = "right";
  ctx.font = "900 18px Arial";
  ctx.fillText(match.homeScore, x + width - 18, y + 39);
  ctx.fillText(match.awayScore, x + width - 18, y + 63);
  ctx.textAlign = "left";
}

function drawShareTeamRow(
  ctx: CanvasRenderingContext2D,
  teamName: string,
  flagCode: string | undefined,
  isWinner: boolean,
  x: number,
  y: number,
  width: number,
) {
  if (isWinner) {
    drawRoundedRect(ctx, x + 12, y - 3, width - 24, 24, 8);
    ctx.fillStyle = "rgba(34, 197, 94, 0.18)";
    ctx.fill();
  }
  drawShareFlag(ctx, flagCode, x + 18, y, 28, 20);
  ctx.fillStyle = isWinner ? "#ffffff" : "#cbd5e1";
  ctx.font = isWinner ? "900 15px Arial" : "700 15px Arial";
  ctx.textAlign = "left";
  ctx.fillText(trimCanvasText(ctx, teamName, width - 96), x + 54, y + 16);
}

function drawShareRound(
  ctx: CanvasRenderingContext2D,
  round: ShareRound,
  x: number,
  top: number,
  cardWidth: number,
  cardHeight: number,
  side: "left" | "right",
) {
  ctx.fillStyle = "#dbeafe";
  ctx.font = "900 18px Arial";
  ctx.textAlign = side === "left" ? "left" : "right";
  ctx.fillText(round.label, side === "left" ? x : x + cardWidth, top - 22);
  ctx.textAlign = "left";

  const count = round.matches.length;
  const totalHeight = getBracketColumnHeight(cardHeight, count);
  const startY = top + (760 - totalHeight) / 2;

  round.matches.forEach((match, index) => {
    const y = startY + index * (count === 8 ? 88 : count === 4 ? 176 : count === 2 ? 352 : 0);
    drawMatchCard(ctx, match, x, y, cardWidth, cardHeight, round.accent, side);
    if (count > 1) {
      drawBracketConnector(ctx, side, x, y, cardWidth, cardHeight, count);
    }
  });
}

function getBracketColumnHeight(cardHeight: number, count: number) {
  if (count === 8) return 8 * cardHeight + 7 * 12;
  if (count === 4) return 4 * cardHeight + 3 * 100;
  if (count === 2) return 2 * cardHeight + 1 * 276;
  return cardHeight;
}

function drawBracketConnector(
  ctx: CanvasRenderingContext2D,
  side: "left" | "right",
  x: number,
  y: number,
  width: number,
  height: number,
  count: number,
) {
  const gapX = 44;
  const midY = y + height / 2;
  const verticalSpan = count === 8 ? 44 : count === 4 ? 88 : 176;
  ctx.strokeStyle = "rgba(148, 163, 184, 0.58)";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (side === "left") {
    const startX = x + width;
    const elbowX = startX + gapX * 0.5;
    ctx.moveTo(startX, midY);
    ctx.lineTo(elbowX, midY);
    ctx.lineTo(elbowX, midY + (count === 1 ? 0 : verticalSpan));
    ctx.lineTo(startX + gapX, midY + (count === 1 ? 0 : verticalSpan));
  } else {
    const startX = x;
    const elbowX = startX - gapX * 0.5;
    ctx.moveTo(startX, midY);
    ctx.lineTo(elbowX, midY);
    ctx.lineTo(elbowX, midY + (count === 1 ? 0 : verticalSpan));
    ctx.lineTo(startX - gapX, midY + (count === 1 ? 0 : verticalSpan));
  }
  ctx.stroke();
}

function drawChampionBadge(
  ctx: CanvasRenderingContext2D,
  champion: Team | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  drawRoundedRect(ctx, x, y, width, height, 24);
  ctx.fillStyle = "rgba(8, 47, 73, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(251, 191, 36, 0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#fbbf24";
  ctx.font = "900 18px Arial";
  ctx.textAlign = "center";
  ctx.fillText("CAMPEON", x + width / 2, y + 26);
  if (champion) {
    drawShareFlag(ctx, flagCodes[champion.id], x + width / 2 - 38, y + 40, 76, 54);
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px Arial";
    ctx.fillText(trimCanvasText(ctx, champion.name, width - 24), x + width / 2, y + 122);
  } else {
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 24px Arial";
    ctx.fillText("Por definir", x + width / 2, y + 88);
  }
  ctx.textAlign = "left";
}

function drawShareFlag(
  ctx: CanvasRenderingContext2D,
  code: string | undefined,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  if (!code) return;
  const img = shareFlagImageCache.get(code);
  if (!img) return;
  ctx.save();
  ctx.beginPath();
  const radius = 3;
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, x, y, width, height);
  ctx.restore();
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.arcTo(x + width, y, x + width, y + height, safeRadius);
  ctx.arcTo(x + width, y + height, x, y + height, safeRadius);
  ctx.arcTo(x, y + height, x, y, safeRadius);
  ctx.arcTo(x, y, x + width, y, safeRadius);
  ctx.closePath();
}

function trimCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let output = text;
  while (output.length > 3 && ctx.measureText(`${output}...`).width > maxWidth) {
    output = output.slice(0, -1);
  }
  return `${output}...`;
}

createRoot(document.getElementById("root")!).render(<App />);
