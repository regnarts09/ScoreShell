#!/usr/bin/env node
// ============================================================
//  ScoreShell CLI — Live Sports Scores in Your Terminal
//  Requires Node.js >= 18 (native fetch). No npm dependencies.
//  Usage: node scoreshell.js
// ============================================================
"use strict";

const readline = require("readline");

// ─── ANSI color constants ────────────────────────────────────
const R    = "\x1b[0m";       // reset
const BOLD = "\x1b[1m";
const DIM  = "\x1b[2m";
const GREEN  = "\x1b[32m";
const AMBER  = "\x1b[33m";
const RED    = "\x1b[31m";
const CYAN   = "\x1b[36m";
const BLUE   = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const ORANGE = "\x1b[38;5;208m";
const MUTED  = "\x1b[90m";
const WHITE  = "\x1b[97m";
const BG_GREEN  = "\x1b[42m";
const BG_AMBER  = "\x1b[43m";
const BG_RED    = "\x1b[41m";
const BG_BLUE   = "\x1b[44m";
const CLEAR  = "\x1b[H\x1b[J";    // Cursor home + erase below (overwrites in place, preserves scrollback)
const HIDE_CURSOR = "\x1b[?25l";
const SHOW_CURSOR = "\x1b[?25h";

// ─── Terminal helpers ────────────────────────────────────────
const W = () => process.stdout.columns || 80;
const H = () => process.stdout.rows || 24;
const print = (s = "") => process.stdout.write(s + "\n");
const cls   = () => process.stdout.write(CLEAR);
const hr    = (ch = "─", color = MUTED) => print(color + ch.repeat(W()) + R);
const pad   = (s, n) => String(s).slice(0, n).padEnd(n);
const rpad  = (s, n) => String(s).slice(0, n).padStart(n);
const center = (s, w = W()) => {
  const plain = s.replace(/\x1b\[[0-9;]*m/g, "");
  const sp = Math.max(0, Math.floor((w - plain.length) / 2));
  return " ".repeat(sp) + s;
};

function box(lines, color = CYAN) {
  const inner = lines.map(l => l.replace(/\x1b\[[0-9;]*m/g, ""));
  const maxLen = inner.reduce((m, l) => Math.max(m, l.length), 0);
  const top = color + "╔" + "═".repeat(maxLen + 2) + "╗" + R;
  const bot = color + "╚" + "═".repeat(maxLen + 2) + "╝" + R;
  print(top);
  lines.forEach((l, i) => {
    const plain = inner[i];
    const pad = " ".repeat(maxLen - plain.length);
    print(color + "║ " + R + l + pad + color + " ║" + R);
  });
  print(bot);
}

// ─── Fetch helpers ───────────────────────────────────────────
const CRICKET_HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.cricbuzz.com/",
};
const ESPN_HEADERS = {
  "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36",
  "Accept": "application/json",
};
const ESPN_SOCCER = "https://site.api.espn.com/apis/site/v2/sports/soccer/all";
const ESPN_NBA    = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const CRICBUZZ    = "https://www.cricbuzz.com";

// ─── ASCII animation frames ──────────────────────────────────

const CRICKET_FRAMES = [
  ["                                                                              ",
   "  O                                                                 |/        ",
   " /|\\                                                                O         ",
   " / \\                                                               /|\\        ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                              ",
   "    O                                                               |/        ",
   "   /|\\                                                              O         ",
   "   / \\                                                             /|\\        ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["      O                                                             |/        ",
   "     -|\\                                                            O         ",
   "     / >                                                           /|\\        ",
   "                                                                   / \\        ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["        O                                                           |/        ",
   "        |\\                                                          O         ",
   "       /| \\                                                        /|\\        ",
   "                                                                   / \\        ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["           O                                                        |/        ",
   "          -|>                                                       O         ",
   "          / \\                                                      /|\\        ",
   "                                                                   / \\        ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["          \\O                                                                  ",
   "           |\\                                                       |/        ",
   "          /|                                                        O         ",
   "          / \\                                                      /|\\        ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["           O/                                                                 ",
   "           |  o                                                               ",
   "          /|                                                        |/        ",
   "          |                                                         O         ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["           O/                                                                 ",
   "           |         o                                              |/        ",
   "          /|                                                        O         ",
   "          / \\                                                      /|\\        ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["           O/                  o                                    |/        ",
   "           |                                                        O         ",
   "          / \\                                                      /|\\        ",
   "                                                                   / \\        ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["           O/                                     o                  |/       ",
   "           |                                                         O        ",
   "          / \\                                                       /|\\       ",
   "                                                                   / \\        ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                    /         ",
   "           O/                                          o           O/         ",
   "           |                                                       |\\         ",
   "          / \\                                                     /|          ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                    /         ",
   "           O/                                                      O/         ",
   "                                                              *    |\\         ",
   "          / \\                                                     /|          ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                          o   ",
   "                                                              SIX!  ->       ",
   "                                                                   O\\         ",
   "           O                                                       |\\         ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
];
const CRICKET_DELAYS = [...Array(10).fill(100), ...Array(3).fill(200)];

const CRICKET_BANNER = [
  "          ███████╗ ██╗ ██╗  ██╗ ██╗                                         ",
  "          ██╔════╝ ██║ ╚██╗██╔╝ ██║                                         ",
  "          ███████╗ ██║  ╚███╔╝  ██║                                         ",
  "          ╚════██║ ██║  ██╔██╗  ╚═╝                                         ",
  "          ███████║ ██║ ██╔╝ ██╗ ██╗                                         ",
  "          ╚══════╝ ╚═╝ ╚═╝  ╚═╝ ╚═╝    ~  CRICKET LIVE  ~                  ",
];

const FOOTBALL_FRAMES = [
  ["                                                                    ",
   "    ~  PREMIER LEAGUE · UCL · LA LIGA · SERIE A · LIGUE 1  ~     ",
   "                                                                    ",
   "   |~~~~~~~~~~~~~~~~~~~~~|                                        ",
   "   |          O          |                                          ",
   "   |         /|\\         |                   O                     ",
   "   |         / \\         |                  /|\\  (o)               ",
   "   +_____________________+                  / \\                    ",
   "                                                                    ",
   "      [GOALKEEPER - READY]          [KICKER]                       ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                    ",
   "    ~  PREMIER LEAGUE · UCL · LA LIGA · SERIE A · LIGUE 1  ~     ",
   "                                                                    ",
   "   |~~~~~~~~~~~~~~~~~~~~~|                                        ",
   "   |          O          |                                          ",
   "   |         /|\\         |                O                        ",
   "   |         / \\         |               -|>  (o)                  ",
   "   +_____________________+               / \\                       ",
   "                                                                    ",
   "      [GOALKEEPER - READY]          [RUN UP...]                    ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                    ",
   "    ~  PREMIER LEAGUE · UCL · LA LIGA · SERIE A · LIGUE 1  ~     ",
   "                                                                    ",
   "   |~~~~~~~~~~~~~~~~~~~~~|                                        ",
   "   |          O          |                                          ",
   "   |         /|\\         |             O/                          ",
   "   |         / \\         |             |\\                          ",
   "   +_____________________+            / |  (o)->                   ",
   "                                                                    ",
   "      [GOALKEEPER - SET]            [SHOOTS!]                      ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                    ",
   "    ~  PREMIER LEAGUE · UCL · LA LIGA · SERIE A · LIGUE 1  ~     ",
   "                                                                    ",
   "   |~~~~~~~~~~~~~~~~~~~~~|                                        ",
   "   |                  O/ |          (o)->>>                        ",
   "   |                 /|  |                                          ",
   "   |                /    |             O/                           ",
   "   +_____________________+             |\\                           ",
   "                                      / \\                           ",
   "      [GK DIVES RIGHT!]             [KICKED]                       ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                              (o)->>>>                             ",
   "    ~  PREMIER LEAGUE · UCL · LA LIGA · SERIE A · LIGUE 1  ~     ",
   "                                                                    ",
   "   |~~~~~~~~~~~~~~~~~~~~~|                                        ",
   "   |                     |                                          ",
   "   O=====                |                                          ",
   "   |\\    \\               |                                          ",
   "   +_____________________+                                          ",
   "                                                                    ",
   "      [GK DIVES - TOO LATE!]                                       ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                    ",
   "    ~  PREMIER LEAGUE · UCL · LA LIGA · SERIE A · LIGUE 1  ~     ",
   "                                                                    ",
   "   |~~~~~~~~~~~~~(o)~~~~~|                                         ",
   "   |              *      |                                          ",
   "   |                     |                                          ",
   "   O===\\                 |                                          ",
   "   +_____________________+                                          ",
   "                                                                    ",
   "           G  O  A  L  !  !  !                                     ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["   \\o/ \\o/ \\o/     G O A L !     \\o/ \\o/ \\o/                      ",
   "    ~  PREMIER LEAGUE · UCL · LA LIGA · SERIE A · LIGUE 1  ~     ",
   "                                                                    ",
   "   |~~~~~~~~~~~~~(o)~~~~~|    \\o/   \\o/   \\o/                     ",
   "   |              *      |     |     |     |                       ",
   "   |                     |    / \\   / \\   / \\                     ",
   "   +_____________________+                                          ",
   "                                                                    ",
   "        * G O A L ! *    * G O A L ! *                             ",
   "                                                                    ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
];
const FOOTBALL_DELAYS = [500, 400, 350, 180, 180, 220, 220];

const FOOTBALL_BANNER = [
  "   ██████╗  ██████╗   █████╗  ██╗                                    ",
  "  ██╔════╝ ██╔═══██╗ ██╔══██╗ ██║                                    ",
  "  ██║  ███╗██║   ██║ ███████║ ██║                                    ",
  "  ██║   ██║██║   ██║ ██╔══██║ ██║                                    ",
  "  ╚██████╔╝╚██████╔╝ ██║  ██║ ███████╗                               ",
  "   ╚═════╝  ╚═════╝  ╚═╝  ╚═╝ ╚══════╝   ~  FOOTBALL LIVE  ~        ",
];

const BASKETBALL_FRAMES = [
  ["                                                                  ",
   "       N B A  ·  L I V E  B A S K E T B A L L                   ",
   "                                                                  ",
   "                        |~~~~~~~~~~~|                             ",
   "                        (           )  <- rim                    ",
   "                        |___________|                             ",
   "                               |   backboard                     ",
   "                             -----                                ",
   "      O        O                                                  ",
   "     /|\\      /|\\  (B)                                           ",
   "     / \\      / \\                                                 ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                  ",
   "       N B A  ·  L I V E  B A S K E T B A L L                   ",
   "                                                                  ",
   "                        |~~~~~~~~~~~|                             ",
   "                        (           )                             ",
   "                        |___________|                             ",
   "                               |                                  ",
   "                             -----                                ",
   "         O      O                                                 ",
   "        /|\\    -|>   (B)                                         ",
   "        / \\    / \\                                                ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                  ",
   "       N B A  ·  L I V E  B A S K E T B A L L                   ",
   "                                                                  ",
   "                        |~~~~~~~~~~~|                             ",
   "                        (           )                             ",
   "                        |___________|                             ",
   "              O/               |                                  ",
   "             /|              -----                                ",
   "            /    O  (B)^                                          ",
   "                /|\\                                               ",
   "               / \\                                                ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                  ",
   "       N B A  ·  L I V E  B A S K E T B A L L                   ",
   "             (B)                                                  ",
   "              O/  |~~~~~~~~~~~|                                   ",
   "             /|   (    (B)v  )                                    ",
   "            /     |___________|                                   ",
   "                         |                                        ",
   "                       -----                                      ",
   "                  O                                               ",
   "                 /|\\                                              ",
   "                 / \\                                              ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                  ",
   "       N B A  ·  L I V E  B A S K E T B A L L                   ",
   "              O/                                                  ",
   "             /|   |~~~~~~~~~~~|                                   ",
   "            /     (*  (B)  *)                                     ",
   "                  |___________|                                   ",
   "                        |                                         ",
   "                      -----                                       ",
   "                                                                  ",
   "          S  L  A  M     D  U  N  K  !  !  !                    ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["                                                                  ",
   "       N B A  ·  L I V E  B A S K E T B A L L                   ",
   "           O                                                      ",
   "          /|__  |~~~~~~~~~~~|                                     ",
   "              \\ (    NET     )  <- swish!                         ",
   "               \\|___________|                                     ",
   "                \\ | | | | /                                       ",
   "                  -----                                           ",
   "                                                                  ",
   "          S  L  A  M     D  U  N  K  !  !  !                    ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
  ["   \\o/ \\o/ \\o/   S L A M  D U N K !   \\o/ \\o/ \\o/               ",
   "       N B A  ·  L I V E  B A S K E T B A L L                   ",
   "                                                                  ",
   "                    |~~~~~~~~~~~|                                 ",
   "                    (    (B)    )   \\o/  \\o/  \\o/               ",
   "                    |___________|    |    |    |                  ",
   "                          |         / \\  / \\  / \\               ",
   "                        -----                                     ",
   "                                                                  ",
   "        (B)  S L A M  D U N K !  (B)                             ",
   "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"],
];
const BASKETBALL_DELAYS = [450, 380, 280, 220, 180, 200, 220];

const BASKETBALL_BANNER = [
  "  ███╗   ██╗ ██████╗   █████╗                                      ",
  "  ████╗  ██║ ██╔══██╗ ██╔══██╗                                     ",
  "  ██╔██╗ ██║ ██████╔╝ ███████║                                     ",
  "  ██║╚██╗██║ ██╔══██╗ ██╔══██║                                     ",
  "  ██║ ╚████║ ██████╔╝ ██║  ██║                                     ",
  "  ╚═╝  ╚═══╝ ╚═════╝  ╚═╝  ╚═╝   ~  BASKETBALL LIVE  ~            ",
];

// ─── Animation engine ────────────────────────────────────────
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function playAnimation(frames, delays, colorFn, banner, bannerColor) {
  process.stdout.write(HIDE_CURSOR);
  try {
    // First frame: clear visible area and start drawing
    process.stdout.write(CLEAR);
    for (let i = 0; i < frames.length; i++) {
      // Overwrite from top — no scrollback append
      if (i > 0) process.stdout.write("\x1b[H\x1b[J");
      for (const line of frames[i]) {
        process.stdout.write(colorFn(line) + "\n");
      }
      await delay(delays[i] ?? 150);
    }
    // Flash banner 5 times
    for (let f = 0; f < 5; f++) {
      process.stdout.write("\x1b[H\x1b[J");
      if (f % 2 === 0) {
        for (const line of banner) {
          process.stdout.write(bannerColor + BOLD + line + R + "\n");
        }
      }
      await delay(f % 2 === 0 ? 160 : 80);
    }
    process.stdout.write("\x1b[H\x1b[J");
    for (const line of banner) {
      process.stdout.write(bannerColor + BOLD + line + R + "\n");
    }
    await delay(700);
  } finally {
    process.stdout.write(SHOW_CURSOR);
  }
}

function cricketColorFn(line) {
  if (line.includes("SIX!")) return AMBER + line + R;
  if (line.includes("*")) return RED + line + R;
  if (line.startsWith("~~~")) return GREEN + line + R;
  return CYAN + line + R;
}
function footballColorFn(line) {
  if (line.includes("GOAL!") || line.includes("G  O  A  L")) return AMBER + line + R;
  if (line.includes("*")) return RED + line + R;
  if (line.startsWith("~~~")) return GREEN + line + R;
  if (line.includes("[") && line.includes("]")) return MUTED + line + R;
  if (line.includes("(o)->")) return AMBER + line + R;
  if (line.includes("\\o/")) return AMBER + line + R;
  return GREEN + line + R;
}
function basketballColorFn(line) {
  if (line.includes("SLAM") || line.includes("DUNK")) return AMBER + line + R;
  if (line.includes("*")) return RED + line + R;
  if (line.startsWith("~~~")) return ORANGE + line + R;
  if (line.includes("NET") || line.includes("swish")) return BLUE + line + R;
  if (line.includes("\\o/") || line.includes("(B)")) return AMBER + line + R;
  if (line.includes("N B A")) return MAGENTA + line + R;
  return ORANGE + line + R;
}

// ─── Cricket API ─────────────────────────────────────────────
function stripHtml(html) {
  let text = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, "");
  text = text.replace(/<[^>]+>/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

function classifyBall(commentary, runs) {
  const c = commentary.toLowerCase();
  if (/\bout\s+lbw\b|\blbw\b|\bcaught\b|\bbowled\b|\bstumped\b|\brun\s+out\b|\bretired\s+hurt\b/.test(c)) return "WICKET";
  if (/,\s*out\s+\w/.test(c) || /^out\s+\w/.test(c)) return "WICKET";
  if (/\bwide\b/.test(c) && runs === 0) return "WIDE";
  if (/\bno.?ball\b/.test(c)) return "NB";
  if (runs === 6) return "SIX";
  if (runs === 4) return "FOUR";
  if (runs === 0) return "•";
  return String(runs);
}

function extractRunsFromComm(comm) {
  const c = comm.toLowerCase();
  if (/\bsix\b|\b6 runs?\b/.test(c)) return 6;
  if (/\bfour\b|\b4 runs?\b|\bboundary\b/.test(c)) return 4;
  if (/\bno run\b|\bdot\b/.test(c)) return 0;
  const m1 = c.match(/\b([1-5])\s+run/);
  if (m1) return parseInt(m1[1]);
  const m2 = comm.match(/^(\d+),/);
  if (m2) { const v = parseInt(m2[1]); if (v <= 6) return v; }
  return 0;
}

async function fetchCricketList() {
  const res = await fetch(`${CRICBUZZ}/cricket-match/live-scores`, { headers: CRICKET_HEADERS });
  if (!res.ok) throw new Error(`Cricbuzz HTTP ${res.status}`);
  const html = await res.text();
  return parseCricketMatches(html);
}

function parseCricketMatches(html) {
  const raw = [];
  const seen = new Set();
  const midRegex = /\\"matchId\\":(\d+)/g;
  let midMatch;
  while ((midMatch = midRegex.exec(html)) !== null) {
    const mid = midMatch[1];
    if (seen.has(mid)) continue;
    seen.add(mid);
    const start = html.lastIndexOf('\\"matchInfo\\":{', midMatch.index);
    if (start < 0) continue;
    const chunk = html.slice(start, start + 2000)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    const infoM = chunk.match(
      /"matchId":(\d+),"seriesId":(\d+),"seriesName":"([^"]+)","matchDesc":"([^"]+)","matchFormat":"([^"]+)","startDate":"([^"]+)",[^}]*"state":"([^"]+)","status":"([^"]+)","team1":\{"teamId":\d+,"teamName":"([^"]+)","teamSName":"([^"]+)"[^}]+\},"team2":\{"teamId":\d+,"teamName":"([^"]+)","teamSName":"([^"]+)"/
    );
    if (!infoM) continue;
    const venueM = chunk.match(/"ground":"([^"]+)","city":"([^"]+)"/);
    const slugM = html.match(new RegExp(`href="/live-cricket-scores/${mid}/([^"]+)"`));
    const state = infoM[7];
    const status = infoM[8];
    let score1 = "", score2 = "";
    if (state !== "Preview" && state !== "Upcoming") {
      const nextMidM = html.slice(midMatch.index + midMatch[0].length, midMatch.index + 2500).match(/\\"matchId\\":\d+/);
      const windowEnd = midMatch.index + (nextMidM ? nextMidM.index : 2500);
      const scoreRaw = html.slice(midMatch.index, windowEnd)
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      const t1 = scoreRaw.match(/"team1Score":\{"inngs1":\{"inningsId":\d+,"runs":(\d+),"wickets":(\d+),"overs":([\d.]+)\}/);
      const t2 = scoreRaw.match(/"team2Score":\{"inngs1":\{"inningsId":\d+,"runs":(\d+),"wickets":(\d+),"overs":([\d.]+)\}/);
      if (t1) score1 = `${t1[1]}/${t1[2]} (${t1[3]} ov)`;
      if (t2) score2 = `${t2[1]}/${t2[2]} (${t2[3]} ov)`;
    }
    raw.push({
      id: mid,
      slug: slugM ? slugM[1] : `match-${mid}`,
      title: `${infoM[9]} vs ${infoM[11]}`,
      matchDesc: infoM[4],
      series: infoM[3],
      status,
      state,
      format: infoM[5],
      venue: venueM ? `${venueM[1]}, ${venueM[2]}` : "",
      score1, score2,
      team1: infoM[9], team2: infoM[11],
      team1Short: infoM[10], team2Short: infoM[12],
      startDate: parseInt(infoM[6]),
    });
  }
  raw.sort((a, b) => {
    const ord = { "In Progress": 0, Complete: 1, Preview: 2, Upcoming: 2 };
    const ao = ord[a.state] ?? 2, bo = ord[b.state] ?? 2;
    if (ao !== bo) return ao - bo;
    return ao === 0 || ao === 1 ? b.startDate - a.startDate : a.startDate - b.startDate;
  });
  return raw;
}

async function fetchCricketMatch(matchId, slug) {
  const url = `${CRICBUZZ}/live-cricket-scores/${matchId}/${slug}`;
  try {
    const res = await fetch(url, { headers: CRICKET_HEADERS });
    if (!res.ok) return null;
    const html = await res.text();
    return parseCricketMatchPage(html, matchId, slug);
  } catch { return null; }
}

function parseCricketMatchPage(html, matchId, slug) {
  const rawText = stripHtml(html);
  let battingScore = "", battingOvers = "", bowlingScore = "";
  let battingTeam = "", bowlingTeam = "";

  const anchorM = html.match(new RegExp(`\\\\"matchId\\\\":\\s*${matchId}`)) ||
    html.match(new RegExp(`"matchId"\\s*:\\s*${matchId}`));
  if (anchorM) {
    const region = html.slice(anchorM.index, anchorM.index + 3000);
    const extractInnings = (key) => {
      const kEsc = key.replace(/"/g, '[\\\\]*"');
      const pat = new RegExp(
        kEsc + `[\\\\]*"\\s*:\\s*\\{[\\\\]*"inngs1[\\\\]*"\\s*:\\s*\\{[^}]*?` +
        `[\\\\]*"runs[\\\\]*"\\s*:\\s*(\\d+)\\s*,[^}]*?` +
        `[\\\\]*"wickets[\\\\]*"\\s*:\\s*(\\d+)\\s*,[^}]*?` +
        `[\\\\]*"overs[\\\\]*"\\s*:\\s*([\\d.]+)`
      );
      const m = region.match(pat);
      return m ? { score: `${m[1]}/${m[2]}`, overs: m[3] } : null;
    };
    const t1 = extractInnings('"team1Score"');
    const t2 = extractInnings('"team2Score"');
    if (t1 && t2) {
      const o1 = parseFloat(t1.overs), o2 = parseFloat(t2.overs);
      if (o1 >= o2) { battingScore = t1.score; battingOvers = t1.overs; bowlingScore = t2.score; }
      else { battingScore = t2.score; battingOvers = t2.overs; bowlingScore = t1.score; }
    } else if (t1) { battingScore = t1.score; battingOvers = t1.overs; }
    else if (t2) { battingScore = t2.score; battingOvers = t2.overs; }
  }

  let title = slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const titleM = html.match(/<title>([^<]+)<\/title>/);
  const ogM = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
  let metaStr = (ogM ? ogM[1] : titleM ? titleM[1] : "").replace(/\s+/g, " ").trim();
  if (metaStr) {
    const pipe = metaStr.split("|");
    let rest = pipe.length > 1 ? pipe[1].trim() : metaStr;
    rest = rest.replace(/\s+(Live Cricket|live cricket|Cricket Stream|Stream,|highlights,).*/i, "").trim();
    const parts = rest.split(",").map(p => p.trim());
    title = parts.length >= 2 ? `${parts[0]}, ${parts[1]}` : rest;
  }

  const seriesM = rawText.match(/Series:\s*([^•|]+?)(?:\s*•|\s*\|)/);
  const venueM = rawText.match(/Venue:\s*([^•|]+?)(?:\s*•|\s*\|)/);
  const tossM = rawText.match(/Toss:\s*([^•|\n(]{5,80})/);
  const crrM = rawText.match(/CRR:\s*([\d.]+)/);
  const rrrM = rawText.match(/RRR:\s*([\d.]+)/);
  const tgtM = rawText.match(/[Tt]arget[:\s]+([\d]+)/);

  let status = "Live";
  for (const pat of [
    /Day \d+:[^.]{5,80}/,
    /Innings Break[^.]{0,40}/,
    /\w[\w\s]+ won by[^.]{5,60}/,
    /\w[\w\s]+ trail[s]? by[^.]{5,60}/,
    /\w[\w\s]+ lead[s]? by[^.]{5,60}/,
    /\w[\w\s]+ need[s]? [\d]+ run[^.]{0,40}/,
  ]) {
    const m = rawText.slice(0, 3000).match(pat);
    if (m) { status = m[0].trim(); break; }
  }

  // Batters
  const batters = [];
  const batSecM = rawText.match(/Batter\s+R\s+B\s+4s\s+6s\s+SR\s+([\s\S]*?)Bowler\s+O\s+M\s+R\s+W\s+ECO/);
  if (batSecM) {
    const batPat = /([A-Z][a-z]+(?:[\s\-'][A-Za-z]+)*)\s+(\*?)\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)/g;
    let bm;
    while ((bm = batPat.exec(batSecM[1])) !== null && batters.length < 3) {
      batters.push({ name: bm[1].trim(), runs: parseInt(bm[3]), balls: parseInt(bm[4]), fours: parseInt(bm[5]), sixes: parseInt(bm[6]), strikeRate: parseFloat(bm[7]), onStrike: false });
    }
  }
  if (batters.length > 0) batters[0].onStrike = true;

  // Bowlers
  const bowlers = [];
  const bwSecM = rawText.match(/Bowler\s+O\s+M\s+R\s+W\s+ECO\s+([\s\S]*?)(?:Key Stats|Partnership|Last Wkt|Recent\s*:|Have Your Say|Toss)/);
  if (bwSecM) {
    const bwPat = /([A-Z][a-z]+(?:[\s\-'][A-Za-z]+)*)\s+(\*?)\s*([\d.]+)\s+(\d+)\s+(\d+)\s+(\d+)\s+([\d.]+)/g;
    let bwm;
    while ((bwm = bwPat.exec(bwSecM[1])) !== null && bowlers.length < 3) {
      bowlers.push({ name: bwm[1].trim(), overs: bwm[3], maidens: parseInt(bwm[4]), runs: parseInt(bwm[5]), wickets: parseInt(bwm[6]), economy: parseFloat(bwm[7]) });
    }
  }

  // Ball-by-ball
  const COMM_JUNK = /\s*(?:FEATURED\s+VIDEOS?|Featured\s+Videos?|Watch\s+\w|Preview:|Highlights?:|Related:|Advertisement|\d+:\d{2}\s+(?:Preview|Highlights?)|the partnership between|Partnership:|Last Wicket|Over\s+\d+\s+End|End of Over)/i;
  const balls = [];
  const ballPat = /(\d{1,3}\.\d)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\s+to\s+([A-Za-z\-']+(?:\s[A-Za-z\-']+)?),\s*([\s\S]*?)(?=\d{1,3}\.\d\s+[A-Z]|Over\s+\d+|$)/g;
  let bm2;
  while ((bm2 = ballPat.exec(rawText)) !== null && balls.length < 40) {
    let rawComm = bm2[4];
    const junkIdx = rawComm.search(COMM_JUNK);
    if (junkIdx >= 0) rawComm = rawComm.slice(0, junkIdx);
    const comm = rawComm.replace(/\s+/g, " ").trim().slice(0, 200);
    const runs = extractRunsFromComm(comm);
    balls.push({ over: bm2[1], bowler: bm2[2], batter: bm2[3], runs, eventType: classifyBall(comm, runs), commentary: comm });
  }

  const partM = rawText.match(/Partnership[:\s]+([\d]+\s*\(\s*[\d]+\s*\))/);
  const lwktM = rawText.match(/Last Wicket\s+([\s\S]*?)(?=Last 10|Reviews|$)/);
  const l10M = rawText.match(/Last 10 overs\s+([\d]+ runs?,?\s*[\d]+ wkts?)/);
  const isCompleted = /won by|match drawn|tied|abandoned/i.test(status);

  return {
    matchId, title,
    series: seriesM ? seriesM[1].trim() : "",
    venue: venueM ? venueM[1].trim() : "",
    status,
    battingTeam, battingScore, battingOvers,
    bowlingTeam, bowlingScore,
    crr: crrM ? crrM[1] : "",
    rrr: rrrM ? rrrM[1] : "",
    target: tgtM ? tgtM[1] : "",
    striker: batters[0] || null,
    nonStriker: batters[1] || null,
    bowler: bowlers[0] || null,
    balls, 
    partnership: partM ? partM[1] : "",
    lastWicket: lwktM ? lwktM[1].trim().slice(0, 100) : "",
    last10Overs: l10M ? l10M[1].trim() : "",
    toss: tossM ? tossM[1].trim().replace(/[,\s]+$/, "") : "",
    isCompleted,
  };
}

// ─── Football API ─────────────────────────────────────────────
function extractLeague(season) {
  const slug = (season?.slug ?? "");
  const parts = slug.replace(/^\d{4}-\d{2,4}-/, "").replace(/-/g, " ");
  return parts.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function mapFootballState(state) {
  if (state === "in") return "In Progress";
  if (state === "post") return "Complete";
  return "Upcoming";
}

async function fetchFootballList() {
  const res = await fetch(`${ESPN_SOCCER}/scoreboard?limit=40`, { headers: ESPN_HEADERS });
  if (!res.ok) throw new Error(`ESPN soccer: ${res.status}`);
  const data = await res.json();
  return (data.events ?? []).map(e => {
    const comp = e.competitions[0];
    const status = comp.status;
    const desc = status.type.description;
    const stateStr = status.type.state;
    const competitors = comp.competitors;
    const home = competitors.find(c => c.homeAway === "home") ?? competitors[0];
    const away = competitors.find(c => c.homeAway === "away") ?? competitors[1];
    const state = mapFootballState(stateStr);
    let clock = "";
    if (state === "In Progress") { clock = status.displayClock ?? ""; if (desc === "Half Time") clock = "HT"; }
    else if (state === "Complete") clock = "FT";
    return {
      id: e.id,
      title: `${home.team.displayName} vs ${away.team.displayName}`,
      league: extractLeague(e.season),
      homeTeam: home.team.displayName, awayTeam: away.team.displayName,
      homeAbbr: home.team.abbreviation, awayAbbr: away.team.abbreviation,
      homeScore: state === "Upcoming" ? "-" : (home.score ?? "0"),
      awayScore: state === "Upcoming" ? "-" : (away.score ?? "0"),
      status: desc, state, clock,
      venue: comp.venue?.fullName ?? "",
      startDate: new Date(comp.startDate).getTime(),
    };
  });
}

async function fetchFootballMatch(id) {
  const res = await fetch(`${ESPN_SOCCER}/summary?event=${id}`, { headers: ESPN_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  const header = data.header ?? {};
  const comp = (header.competitions ?? [])[0] ?? {};
  const competitors = comp.competitors ?? [];
  const home = competitors.find(c => c.homeAway === "home") ?? competitors[0] ?? {};
  const away = competitors.find(c => c.homeAway === "away") ?? competitors[1] ?? {};
  const status = comp.status ?? {};
  const desc = status.type?.description ?? "";
  const stateStr = status.type?.state ?? "pre";
  const state = mapFootballState(stateStr);
  let clock = "";
  if (state === "In Progress") { clock = status.displayClock ?? ""; if (desc === "Half Time") clock = "HT"; }
  else if (state === "Complete") clock = "FT";
  const homeId = home.team?.id ?? "";

  // Key events
  const goals = [], cards = [], keyEvents = [];
  for (const ev of (data.keyEvents ?? [])) {
    const typeText = ev.type?.text ?? "";
    const typeLow = typeText.toLowerCase();
    const clk = ev.clock?.displayValue ?? "";
    const player = (ev.participants ?? [])[0]?.athlete?.displayName ?? (ev.athletesInvolved ?? [])[0]?.displayName ?? "";
    const teamId = ev.team?.id ?? "";
    const teamName = teamId === homeId ? (home.team?.displayName ?? "") : (away.team?.displayName ?? "");
    const text = ev.text ?? ev.shortText ?? typeText;
    if (typeLow.includes("goal")) {
      goals.push({ minute: clk, clock: clk, team: teamName, player, type: typeText, isOwnGoal: typeLow.includes("own"), isPenalty: typeLow.includes("penalty") || typeLow.includes("pen") });
      keyEvents.push({ clock: clk, text, type: "goal" });
    } else if (typeLow.includes("card")) {
      const cardType = typeLow.includes("yellow-red") || typeLow.includes("second yellow") ? "yellow-red" : typeLow.includes("red") ? "red" : "yellow";
      cards.push({ minute: clk, clock: clk, team: teamName, player, type: cardType });
      keyEvents.push({ clock: clk, text, type: "card" });
    } else if (typeLow.includes("substitut")) {
      keyEvents.push({ clock: clk, text, type: "substitution" });
    } else {
      keyEvents.push({ clock: clk, text, type: "other" });
    }
  }

  // Commentary
  const commentary = (data.commentary ?? [])
    .filter(c => c.text && !c.text.startsWith("?"))
    .map(c => ({ clock: c.clock?.displayValue ?? "", text: c.text }))
    .reverse().slice(0, 25);

  // Stats
  const STAT_KEYS = ["possessionPct","totalShots","shotsOnTarget","wonCorners","yellowCards","redCards","saves","foulsCommitted","offsides"];
  const STAT_LABELS = { possessionPct:"Possession %", totalShots:"Shot Attempts", shotsOnTarget:"Shots on Goal", wonCorners:"Corner Kicks", yellowCards:"Yellow Cards", redCards:"Red Cards", saves:"Saves", foulsCommitted:"Fouls", offsides:"Offsides" };
  const bsTeams = data.boxscore?.teams ?? [];
  const homeBs = bsTeams.find(t => t.homeAway === "home") ?? bsTeams[0];
  const awayBs = bsTeams.find(t => t.homeAway === "away") ?? bsTeams[1];
  const homeStatMap = {}, awayStatMap = {};
  for (const s of (homeBs?.statistics ?? [])) homeStatMap[s.name] = s.displayValue;
  for (const s of (awayBs?.statistics ?? [])) awayStatMap[s.name] = s.displayValue;
  const stats = STAT_KEYS
    .filter(k => homeStatMap[k] !== undefined || awayStatMap[k] !== undefined)
    .map(k => ({ name: k, label: STAT_LABELS[k] ?? k, home: homeStatMap[k] ?? "0", away: awayStatMap[k] ?? "0" }));

  // Lineup
  let lineup = null;
  const rosters = data.rosters ?? [];
  if (rosters.length >= 2) {
    const homeRoster = rosters.find(r => r.homeAway === "home") ?? rosters[0];
    const awayRoster = rosters.find(r => r.homeAway === "away") ?? rosters[1];
    const mapPlayers = roster => (roster.roster ?? []).map(p => ({
      jersey: p.jersey ?? "",
      name: p.athlete?.displayName ?? "",
      shortName: p.athlete?.shortName ?? p.athlete?.displayName ?? "",
      formationPlace: parseInt(p.formationPlace ?? "0") || 0,
      starter: p.starter ?? false,
      subbedIn: p.subbedIn ?? false,
      subbedOut: p.subbedOut ?? false,
    }));
    lineup = {
      homeFormation: homeRoster.formation ?? "",
      awayFormation: awayRoster.formation ?? "",
      homePlayers: mapPlayers(homeRoster),
      awayPlayers: mapPlayers(awayRoster),
      homeTeam: homeRoster.team?.displayName ?? home.team?.displayName ?? "",
      awayTeam: awayRoster.team?.displayName ?? away.team?.displayName ?? "",
    };
  }

  return {
    id, title: `${home.team?.displayName ?? "Home"} vs ${away.team?.displayName ?? "Away"}`,
    league: extractLeague(data.header?.season ?? {}),
    homeTeam: home.team?.displayName ?? "", awayTeam: away.team?.displayName ?? "",
    homeAbbr: home.team?.abbreviation ?? "", awayAbbr: away.team?.abbreviation ?? "",
    homeScore: home.score ?? (state === "Upcoming" ? "-" : "0"),
    awayScore: away.score ?? (state === "Upcoming" ? "-" : "0"),
    status: desc, state, clock,
    venue: data.gameInfo?.venue?.fullName ?? comp.venue?.fullName ?? "",
    startDate: new Date(comp.date ?? "").getTime() || 0,
    goals, cards, keyEvents, commentary, stats, lineup,
  };
}

// ─── Basketball API ───────────────────────────────────────────
function mapBBState(stateStr) {
  if (stateStr === "in") return "In Progress";
  if (stateStr === "post") return "Complete";
  return "Upcoming";
}
function buildClock(status) {
  const state = status?.type?.state ?? "";
  if (state === "post") return "Final";
  if (state === "in") {
    const period = status?.period ?? 1;
    const label = period > 4 ? `OT${period - 4}` : `Q${period}`;
    const clock = status?.displayClock ?? "";
    return clock ? `${label} ${clock}` : label;
  }
  return status?.type?.shortDetail ?? status?.type?.detail ?? "Upcoming";
}

async function fetchBasketballList() {
  const res = await fetch(`${ESPN_NBA}/scoreboard`, { headers: ESPN_HEADERS });
  if (!res.ok) throw new Error(`ESPN NBA: ${res.status}`);
  const data = await res.json();
  return (data.events ?? []).map(ev => {
    const comp = ev.competitions?.[0];
    const home = comp?.competitors?.find(t => t.homeAway === "home");
    const away = comp?.competitors?.find(t => t.homeAway === "away");
    const status = comp?.status ?? ev.status;
    const state = mapBBState(status?.type?.state ?? "");
    return {
      id: String(ev.id),
      title: `${away?.team?.displayName ?? "Away"} @ ${home?.team?.displayName ?? "Home"}`,
      homeTeam: home?.team?.displayName ?? "Home",
      awayTeam: away?.team?.displayName ?? "Away",
      homeAbbr: home?.team?.abbreviation ?? "HM",
      awayAbbr: away?.team?.abbreviation ?? "AW",
      homeScore: home?.score != null ? Number(home.score) : null,
      awayScore: away?.score != null ? Number(away.score) : null,
      state, clock: buildClock(status), period: status?.period ?? 0,
    };
  });
}

async function fetchBasketballMatch(id) {
  const res = await fetch(`${ESPN_NBA}/summary?event=${id}`, { headers: ESPN_HEADERS });
  if (!res.ok) return null;
  const data = await res.json();
  const header = data?.header;
  const comp = header?.competitions?.[0];
  if (!comp) return null;
  const home = comp.competitors?.find(t => t.homeAway === "home");
  const away = comp.competitors?.find(t => t.homeAway === "away");
  const status = comp.status ?? {};
  const state = mapBBState(status?.type?.state ?? "");
  
  const homeLinescores = home?.linescores ?? [];
  const awayLinescores = away?.linescores ?? [];
  const quarterScores = [];
  const maxQ = Math.max(homeLinescores.length, awayLinescores.length);
  for (let i = 0; i < maxQ; i++) {
    quarterScores.push({
      period: i < 4 ? `Q${i+1}` : `OT${i-3}`,
      home: homeLinescores[i]?.displayValue ?? "-",
      away: awayLinescores[i]?.displayValue ?? "-",
    });
  }
  if (maxQ > 0) quarterScores.push({ period: "Total", home: home?.score != null ? String(home.score) : "-", away: away?.score != null ? String(away.score) : "-" });

  const KEY_ORDER = ["minutes","points","fieldGoalsMade-fieldGoalsAttempted","threePointFieldGoalsMade-threePointFieldGoalsAttempted","freeThrowsMade-freeThrowsAttempted","rebounds","assists","turnovers","steals","blocks","fouls","plusMinus"];
  const boxScore = (data?.boxscore?.players ?? []).map(teamBlock => {
    const teamInfo = teamBlock.team;
    const statsBlock = teamBlock.statistics?.[0];
    const keys = statsBlock?.keys ?? KEY_ORDER;
    const athletes = statsBlock?.athletes ?? [];
    const players = athletes.slice(0, 8).map(a => {
      const stats = a.stats ?? [];
      const get = k => { const i = keys.indexOf(k); return i >= 0 && i < stats.length ? stats[i] : "-"; };
      return {
        name: a.athlete?.displayName ?? "Unknown",
        position: a.athlete?.position?.abbreviation ?? "-",
        minutes: get("minutes"),
        points: get("points"),
        rebounds: get("rebounds"),
        assists: get("assists"),
        steals: get("steals"),
        blocks: get("blocks"),
        fg: get("fieldGoalsMade-fieldGoalsAttempted"),
        threeP: get("threePointFieldGoalsMade-threePointFieldGoalsAttempted"),
        ft: get("freeThrowsMade-freeThrowsAttempted"),
        plusMinus: get("plusMinus"),
      };
    });
    return { teamName: teamInfo?.displayName ?? "Team", teamAbbr: teamInfo?.abbreviation ?? "TM", players };
  });

  return {
    id: String(comp.id ?? id),
    title: `${away?.team?.displayName ?? "Away"} @ ${home?.team?.displayName ?? "Home"}`,
    homeTeam: home?.team?.displayName ?? "Home",
    awayTeam: away?.team?.displayName ?? "Away",
    homeAbbr: home?.team?.abbreviation ?? "HM",
    awayAbbr: away?.team?.abbreviation ?? "AW",
    homeScore: home?.score != null ? Number(home.score) : null,
    awayScore: away?.score != null ? Number(away.score) : null,
    state, clock: buildClock(status), period: status?.period ?? 0,
    venue: comp.venue?.fullName ?? "",
    quarterScores, boxScore,
  };
}

// ─── Render helpers ───────────────────────────────────────────
function statBar(label, homeVal, awayVal, w = W()) {
  const BARW = Math.min(24, Math.floor((w - 28) / 2));
  const hv = parseFloat(homeVal) || 0;
  const av = parseFloat(awayVal) || 0;
  const total = hv + av;
  const hFill = total > 0 ? Math.round((hv / total) * BARW) : BARW / 2;
  const aFill = total > 0 ? Math.round((av / total) * BARW) : BARW / 2;
  const hBar = AMBER + "█".repeat(hFill) + MUTED + "░".repeat(BARW - hFill) + R;
  const aBar = MUTED + "░".repeat(BARW - aFill) + GREEN + "█".repeat(aFill) + R;
  const lbl = pad(label, 14);
  const hStr = rpad(String(homeVal), 5);
  const aStr = pad(String(awayVal), 5);
  print(`  ${CYAN}${lbl}${R}  ${AMBER}${hStr}${R} ${hBar}|${aBar} ${GREEN}${aStr}${R}`);
}

function ballBadge(eventType) {
  switch (eventType) {
    case "WICKET": return RED + BOLD + " W " + R;
    case "SIX":    return CYAN + BOLD + " 6 " + R;
    case "FOUR":   return GREEN + BOLD + " 4 " + R;
    case "WIDE":   return AMBER + " Wd" + R;
    case "NB":     return AMBER + " NB" + R;
    case "•":      return MUTED + " • " + R;
    default:       return WHITE + ` ${eventType} ` + R;
  }
}

function statusBadge(state, clock) {
  if (state === "In Progress") return GREEN + BOLD + " LIVE " + (clock ? `${clock}'` : "") + R;
  if (state === "Complete")    return MUTED + " FT " + R;
  return MUTED + " SCH " + R;
}

function stateColor(state) {
  if (state === "In Progress") return GREEN;
  if (state === "Complete")    return MUTED;
  return CYAN;
}

// ─── Viewport helper ─────────────────────────────────────────
// Computes which items [start, end) to render so the selected
// item is always visible within the available terminal rows.
function computeViewport(items, linesPerItem, selected, availableRows) {
  const n = items.length;
  if (n === 0) return { start: 0, end: 0 };

  // Try to center the selected item in the viewport
  // First, figure out how many items fit
  let start = 0, end = 0, usedRows = 0;

  // Start from selected and expand outward
  // 1) Calculate a start that keeps selected visible
  // Walk backward from selected to find how far up we can go
  let totalLines = 0;
  for (let i = 0; i < n; i++) totalLines += linesPerItem[i];

  // If everything fits, show all
  if (totalLines <= availableRows) return { start: 0, end: n };

  // Binary-search style: find a window around selected
  // Start by putting selected at the top and expanding down
  start = selected;
  usedRows = 0;
  end = start;
  while (end < n && usedRows + linesPerItem[end] <= availableRows) {
    usedRows += linesPerItem[end];
    end++;
  }

  // If we have room, try to expand upward
  while (start > 0 && usedRows + linesPerItem[start - 1] <= availableRows) {
    start--;
    usedRows += linesPerItem[start];
  }

  // If selected is near the end, shift viewport up
  if (end >= n && start > 0) {
    while (start > 0 && usedRows + linesPerItem[start - 1] <= availableRows) {
      start--;
      usedRows += linesPerItem[start];
    }
  }

  return { start, end };
}

// ─── Render screens ───────────────────────────────────────────

function renderHeader(sport, subtitle = "") {
  const w = W();
  print("");
  print(center(BOLD + CYAN + "╔══════════════════════════════╗" + R, w));
  print(center(BOLD + CYAN + "║  " + WHITE + "ScoreShell" + CYAN + " ·  " + AMBER + sport + CYAN + "  Live  ║" + R, w));
  print(center(BOLD + CYAN + "╚══════════════════════════════╝" + R, w));
  if (subtitle) print(center(MUTED + subtitle + R, w));
  print("");
}

function renderHelp(extra = "") {
  const hints = [MUTED + "[↑↓] navigate  [Enter] select  [b] back  [r] refresh  [q] quit" + (extra ? "  " + extra : "") + R];
  print(hints[0]);
  hr();
}


// ── Cricket List ──────────────────────────────────────────────
function renderCricketList(matches, selected = 0) {
  cls();
  renderHeader("CRICKET");
  print(BOLD + "  #  Teams                          Format   Status" + R);
  hr("─");

  // Viewport scrolling: header uses ~7 lines, footer ~3, each match 1-2 lines
  const headerLines = 7;
  const footerLines = 4;
  const availableRows = Math.max(5, H() - headerLines - footerLines);
  // Estimate lines per match (some have score lines)
  const matchLines = matches.map(m => m.score1 ? 2 : 1);
  const { start, end } = computeViewport(matches, matchLines, selected, availableRows);

  if (start > 0) print(MUTED + "  ▲ " + start + " more above" + R);
  for (let i = start; i < end; i++) {
    const m = matches[i];
    const sel = i === selected;
    const prefix = sel ? GREEN + "> " : "  ";
    const num = rpad(String(i + 1), 2) + " ";
    const title = pad(m.title, 30);
    const fmt = pad(m.format, 8);
    const statusStr = m.state === "In Progress"
      ? GREEN + BOLD + "● LIVE" + R
      : m.state === "Complete" ? MUTED + "✓ Full" + R : CYAN + "◷ Sched" + R;
    print(prefix + AMBER + num + R + (sel ? BOLD : "") + WHITE + title + R + MUTED + fmt + R + "  " + statusStr);
    if (m.score1) print("     " + MUTED + m.score1 + (m.score2 ? "  |  " + m.score2 : "") + R);
  }
  if (end < matches.length) print(MUTED + "  ▼ " + (matches.length - end) + " more below" + R);

  print("");
  renderHelp("[# + Enter] jump to match");
}

// ── Football List ─────────────────────────────────────────────
function renderFootballList(matches, selected = 0) {
  cls();
  renderHeader("FOOTBALL");
  print(BOLD + "  #  Match                              Score    Status" + R);
  hr("─");

  const headerLines = 7;
  const footerLines = 4;
  const availableRows = Math.max(5, H() - headerLines - footerLines);
  const matchLines = matches.map(m => m.league ? 2 : 1);
  const { start, end } = computeViewport(matches, matchLines, selected, availableRows);

  if (start > 0) print(MUTED + "  ▲ " + start + " more above" + R);
  for (let i = start; i < end; i++) {
    const m = matches[i];
    const sel = i === selected;
    const prefix = sel ? GREEN + "> " : "  ";
    const num = rpad(String(i + 1), 2) + " ";
    const fullTitle = pad(`${m.homeTeam} vs ${m.awayTeam}`, 32);
    const score = m.state === "Upcoming" ? "    -  -   " : pad(`${m.homeScore} - ${m.awayScore}`, 10);
    const statusStr = m.state === "In Progress"
      ? GREEN + BOLD + "● " + (m.clock || "LIVE") + R
      : m.state === "Complete" ? MUTED + "FT" + R : CYAN + "SCH" + R;
    print(prefix + AMBER + num + R + (sel ? BOLD : "") + WHITE + fullTitle + R + AMBER + score + R + "  " + statusStr);
    if (m.league) print("     " + MUTED + m.league + R);
  }
  if (end < matches.length) print(MUTED + "  ▼ " + (matches.length - end) + " more below" + R);

  print("");
  renderHelp("[# + Enter] jump to match");
}

// ── Basketball List ───────────────────────────────────────────
function renderBasketballList(matches, selected = 0) {
  cls();
  renderHeader("BASKETBALL (NBA)");
  print(BOLD + "  #  Match                              Score    Status" + R);
  hr("─");

  const headerLines = 7;
  const footerLines = 4;
  const availableRows = Math.max(5, H() - headerLines - footerLines);
  const matchLines = matches.map(() => 1);
  const { start, end } = computeViewport(matches, matchLines, selected, availableRows);

  if (start > 0) print(MUTED + "  ▲ " + start + " more above" + R);
  for (let i = start; i < end; i++) {
    const m = matches[i];
    const sel = i === selected;
    const prefix = sel ? GREEN + "> " : "  ";
    const num = rpad(String(i + 1), 2) + " ";
    const title = pad(m.title, 36);
    const score = m.homeScore != null
      ? pad(`${m.awayScore} - ${m.homeScore}`, 10)
      : "    -  -   ";
    const statusStr = m.state === "In Progress"
      ? GREEN + BOLD + "● " + m.clock + R
      : m.state === "Complete" ? MUTED + "Final" + R : CYAN + m.clock + R;
    print(prefix + AMBER + num + R + (sel ? BOLD : "") + WHITE + title + R + ORANGE + score + R + "  " + statusStr);
  }
  if (end < matches.length) print(MUTED + "  ▼ " + (matches.length - end) + " more below" + R);

  print("");
  renderHelp("[# + Enter] jump to match");
}

// ── Cricket Detail ────────────────────────────────────────────
function renderCricketDetail(m, match, refreshIn) {
  cls();
  renderHeader("CRICKET", m.series ? m.series.slice(0, 70) : "");

  // Title + score
  const liveTag = !match.isCompleted ? GREEN + BOLD + " ● LIVE " + R : MUTED + " ✓ " + R;
  print(center(BOLD + WHITE + match.title + R + liveTag));
  if (match.venue) print(center(MUTED + match.venue + R));
  if (match.toss) print(center(MUTED + "Toss: " + match.toss + R));
  print("");

  if (match.battingScore) {
    print(center(BOLD + AMBER + match.battingScore + R + MUTED + (match.battingOvers ? `  (${match.battingOvers} ov)` : "") + R));
  }
  if (match.bowlingScore) print(center(MUTED + match.bowlingScore + R));
  if (match.target) print(center(CYAN + "Target: " + match.target + R));
  
  const statsLine = [];
  if (match.crr) statsLine.push(GREEN + "CRR " + match.crr + R);
  if (match.rrr) statsLine.push(AMBER + "RRR " + match.rrr + R);
  if (match.partnership) statsLine.push(CYAN + "P'ship " + match.partnership + R);
  if (statsLine.length) print(center(statsLine.join("  ")));
  print(center(AMBER + match.status + R));
  print("");

  // Batters
  if (match.striker || match.nonStriker) {
    hr("─");
    print(BOLD + WHITE + "  BATTING" + R);
    print(MUTED + "  " + pad("Batter", 22) + rpad("R", 5) + rpad("B", 5) + rpad("4s", 4) + rpad("6s", 4) + rpad("SR", 7) + R);
    hr("─");
    for (const b of [match.striker, match.nonStriker].filter(Boolean)) {
      const star = b.onStrike ? GREEN + "*" + R : " ";
      print(`  ${star} ${BOLD}${pad(b.name, 21)}${R}  ${AMBER}${rpad(b.runs, 4)}${R}  ${rpad(b.balls, 4)}  ${MUTED}${rpad(b.fours, 3)}  ${rpad(b.sixes, 3)}  ${rpad(b.strikeRate.toFixed(1), 6)}${R}`);
    }
  }

  // Bowler
  if (match.bowler) {
    print("");
    print(BOLD + WHITE + "  BOWLING" + R);
    print(MUTED + "  " + pad("Bowler", 22) + rpad("O", 5) + rpad("M", 4) + rpad("R", 5) + rpad("W", 4) + rpad("ECO", 6) + R);
    hr("─");
    const bw = match.bowler;
    print(`  ${BOLD}${pad(bw.name, 22)}${R}  ${AMBER}${rpad(bw.overs, 4)}${R}  ${rpad(bw.maidens, 3)}  ${rpad(bw.runs, 4)}  ${RED}${rpad(bw.wickets, 3)}${R}  ${MUTED}${rpad(bw.economy.toFixed(2), 5)}${R}`);
  }

  // Ball-by-ball
  if (match.balls.length > 0) {
    print("");
    hr("─");
    print(BOLD + WHITE + "  BALL-BY-BALL" + R + MUTED + " (recent)" + R);
    print("");
    const recent = match.balls.slice(0, 20);
    let currentOver = null;
    const overGroups = {};
    for (const ball of recent) {
      const ov = ball.over.split(".")[0];
      if (!overGroups[ov]) overGroups[ov] = [];
      overGroups[ov].push(ball);
    }
    for (const [ov, balls] of Object.entries(overGroups)) {
      process.stdout.write(`  ${MUTED}Ov ${ov}:${R} `);
      for (const ball of balls) {
        process.stdout.write(ballBadge(ball.eventType) + " ");
      }
      print("");
      // commentary for last ball of over
      const lastBall = balls[balls.length - 1];
      if (lastBall.commentary) print(`    ${MUTED}${lastBall.commentary.slice(0, W() - 6)}${R}`);
    }
  }

  // Footer stats
  if (match.lastWicket || match.last10Overs) {
    print("");
    hr("─");
    if (match.lastWicket) print(`  ${MUTED}Last Wkt: ${match.lastWicket.slice(0, W() - 16)}${R}`);
    if (match.last10Overs) print(`  ${MUTED}Last 10: ${match.last10Overs}${R}`);
  }

  print("");
  hr();
  print(MUTED + `  refreshes in ${refreshIn}s  ·  [b] back  [r] refresh  [q] quit` + R);
}

// ── Football Detail ───────────────────────────────────────────
function renderFootballDetail(m, match, refreshIn) {
  cls();
  renderHeader("FOOTBALL", match.league || "");

  // Score header
  const liveTag = match.state === "In Progress" ? GREEN + BOLD + " ● " + (match.clock || "LIVE") + "' " + R : MUTED + " " + match.clock + " " + R;
  print(center(BOLD + WHITE + match.homeTeam + R + "  " + BOLD + AMBER + (match.homeScore ?? "-") + " – " + (match.awayScore ?? "-") + R + "  " + BOLD + WHITE + match.awayTeam + R + liveTag));
  print(center(MUTED + match.status + R));
  if (match.venue) print(center(MUTED + match.venue + R));
  print("");

  // Goals timeline
  if (match.goals.length > 0) {
    hr("─");
    print(BOLD + WHITE + "  GOALS" + R);
    for (const g of match.goals) {
      const icon = g.isOwnGoal ? RED + "[OG]" + R : g.isPenalty ? AMBER + "[P]" + R : GREEN + "[G]" + R;
      print(`  ${AMBER}${rpad(g.minute + "'", 6)}${R} ${icon} ${WHITE}${g.player}${R} ${MUTED}(${g.team})${R}`);
    }
  }

  // Cards
  if (match.cards.length > 0) {
    print("");
    hr("─");
    print(BOLD + WHITE + "  CARDS" + R);
    for (const c of match.cards) {
      const color = c.type === "red" || c.type === "yellow-red" ? RED : AMBER;
      const icon = c.type === "red" ? "[R]" : c.type === "yellow-red" ? "[Y/R]" : "[Y]";
      print(`  ${AMBER}${rpad(c.minute + "'", 6)}${R} ${color}${BOLD}${icon}${R} ${WHITE}${c.player}${R} ${MUTED}(${c.team})${R}`);
    }
  }

  // Stats bars
  if (match.stats.length > 0) {
    print("");
    hr("─");
    const w = W();
    const hdrH = pad(match.homeAbbr, 6);
    const hdrA = rpad(match.awayAbbr, 6);
    print(`  ${AMBER}${BOLD}${hdrH}${R}${" ".repeat(Math.max(0, w - 20))}${GREEN}${BOLD}${hdrA}${R}`);
    for (const s of match.stats) {
      statBar(s.label, s.home, s.away, w);
    }
  }

  // Lineup
  if (match.lineup) {
    print("");
    hr("─");
    const { homePlayers, awayPlayers, homeFormation, awayFormation, homeTeam, awayTeam } = match.lineup;
    print(BOLD + WHITE + `  LINEUPS` + R);
    print(`  ${AMBER}${homeTeam}${R} ${MUTED}(${homeFormation})${R}   vs   ${GREEN}${awayTeam}${R} ${MUTED}(${awayFormation})${R}`);
    print("");

    // Group starters by formationPlace rows
    // formationPlace: 1=GK, 2-4=DEF, 5-8=MID, 9-11=FWD (approximation)
    const homeStarters = homePlayers.filter(p => p.starter && p.formationPlace > 0).sort((a, b) => a.formationPlace - b.formationPlace);
    const awayStarters = awayPlayers.filter(p => p.starter && p.formationPlace > 0).sort((a, b) => a.formationPlace - b.formationPlace);

    const lineLabel = fp => fp <= 1 ? "GK" : fp <= 4 ? "DEF" : fp <= 8 ? "MID" : "FWD";
    const colW = Math.floor((W() - 10) / 2);

    const rowGroups = { GK: [], DEF: [], MID: [], FWD: [] };
    const homeRows = { GK: [], DEF: [], MID: [], FWD: [] };
    const awayRows = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const p of homeStarters) homeRows[lineLabel(p.formationPlace)].push(p);
    for (const p of awayStarters) awayRows[lineLabel(p.formationPlace)].push(p);

    for (const section of ["GK", "DEF", "MID", "FWD"]) {
      const hp = homeRows[section], ap = awayRows[section];
      if (!hp.length && !ap.length) continue;
      print(`  ${MUTED}── ${section} ──${R}`);
      const rows = Math.max(hp.length, ap.length);
      for (let i = 0; i < rows; i++) {
        const h = hp[i];
        const a = ap[i];
        const hStr = h ? `${AMBER}#${h.jersey}${R} ${pad(h.shortName, colW - 5)}` : " ".repeat(colW);
        const aStr = a ? `${GREEN}#${a.jersey}${R} ${a.shortName}` : "";
        print(`    ${hStr}  ${aStr}`);
      }
    }

    // Subs
    const homeSubs = homePlayers.filter(p => !p.starter);
    const awaySubs = awayPlayers.filter(p => !p.starter);
    if (homeSubs.length || awaySubs.length) {
      print(`  ${MUTED}── SUBS ──${R}`);
      const maxSubs = Math.min(Math.max(homeSubs.length, awaySubs.length), 7);
      for (let i = 0; i < maxSubs; i++) {
        const h = homeSubs[i];
        const a = awaySubs[i];
        const hStr = h ? `${MUTED}#${h.jersey} ${pad(h.shortName, colW - 5)}${R}` : " ".repeat(colW);
        const aStr = a ? `${MUTED}#${a.jersey} ${a.shortName}${R}` : "";
        print(`    ${hStr}  ${aStr}`);
      }
    }
  }

  // Commentary
  if (match.commentary.length > 0) {
    print("");
    hr("─");
    print(BOLD + WHITE + "  COMMENTARY" + R + MUTED + " (latest)" + R);
    print("");
    for (const c of match.commentary.slice(0, 8)) {
      const clk = c.clock ? AMBER + rpad(c.clock + "'", 7) + R : "       ";
      print(`  ${clk} ${c.text.slice(0, W() - 12)}`);
    }
  }

  print("");
  hr();
  print(MUTED + `  refreshes in ${refreshIn}s  ·  [b] back  [r] refresh  [q] quit` + R);
}

// ── Basketball Detail ─────────────────────────────────────────
function renderBasketballDetail(m, match, refreshIn) {
  cls();
  renderHeader("BASKETBALL (NBA)");

  // Score header
  const liveTag = match.state === "In Progress" ? GREEN + BOLD + " ● " + match.clock + " " + R : MUTED + " " + match.clock + " " + R;
  print(center(BOLD + WHITE + match.awayTeam + R + "  " + BOLD + ORANGE + (match.awayScore ?? "-") + " – " + (match.homeScore ?? "-") + R + "  " + BOLD + WHITE + match.homeTeam + R + liveTag));
  if (match.venue) print(center(MUTED + match.venue + R));
  print("");

  // Quarter scores table
  if (match.quarterScores.length > 0) {
    hr("─");
    print(BOLD + WHITE + "  QUARTER SCORES" + R);
    print("");
    const periods = match.quarterScores.map(q => q.period);
    const headRow = "  " + pad("Team", 20) + periods.map(p => rpad(p, 6)).join("");
    print(BOLD + MUTED + headRow + R);
    hr("─");
    // Away row
    const awayRow = "  " + pad(match.awayAbbr, 20) + match.quarterScores.map(q => {
      const isTotal = q.period === "Total";
      const color = isTotal ? BOLD + ORANGE : ORANGE;
      return color + rpad(q.away, 6) + R;
    }).join("");
    print(awayRow);
    // Home row
    const homeRow = "  " + pad(match.homeAbbr, 20) + match.quarterScores.map(q => {
      const isTotal = q.period === "Total";
      const color = isTotal ? BOLD + CYAN : CYAN;
      return color + rpad(q.home, 6) + R;
    }).join("");
    print(homeRow);
  }

  // Box score
  if (match.boxScore.length > 0) {
    for (const team of match.boxScore) {
      print("");
      hr("─");
      print(BOLD + WHITE + `  ${team.teamName}` + R + MUTED + ` — Box Score` + R);
      print("");
      print(MUTED + "  " + pad("Player", 22) + pad("Pos", 5) + rpad("MIN", 6) + rpad("PTS", 5) + rpad("REB", 5) + rpad("AST", 5) + rpad("STL", 5) + rpad("BLK", 5) + rpad("FG", 8) + rpad("3P", 8) + rpad("FT", 8) + rpad("+/-", 5) + R);
      hr("─");
      for (const p of team.players) {
        const pts = parseInt(p.points) || 0;
        const ptColor = pts >= 20 ? BOLD + ORANGE : pts >= 10 ? AMBER : WHITE;
        print(`  ${pad(p.name, 22)}${MUTED}${pad(p.position, 5)}${R}${MUTED}${rpad(p.minutes, 6)}${R}${ptColor}${rpad(p.points, 5)}${R}${CYAN}${rpad(p.rebounds, 5)}${R}${GREEN}${rpad(p.assists, 5)}${R}${MUTED}${rpad(p.steals, 5)}${rpad(p.blocks, 5)}${rpad(p.fg, 8)}${rpad(p.threeP, 8)}${rpad(p.ft, 8)}${rpad(p.plusMinus, 5)}${R}`);
      }
    }
  }

  print("");
  hr();
  print(MUTED + `  refreshes in ${refreshIn}s  ·  [b] back  [r] refresh  [q] quit` + R);
}

// ─── Sport selector ───────────────────────────────────────────
async function renderSportSelector() {
  const sports = ["CRICKET", "FOOTBALL", "BASKETBALL"];
  const colors = [GREEN, AMBER, ORANGE];
  let sel = 0;
  let escBuf = "";
  let escTimer = null;

  return new Promise(resolve => {
    function draw() {
      cls();
      print("");
      print(center(BOLD + CYAN + "╔═══════════════════════════════════════╗" + R));
      print(center(BOLD + CYAN + "║" + R + BOLD + WHITE + "   ScoreShell  ·  Live Sports Terminal  " + R + BOLD + CYAN + "║" + R));
      print(center(BOLD + CYAN + "╚═══════════════════════════════════════╝" + R));
      print("");
      print(center(MUTED + "Select a sport to watch live" + R));
      print("");

      sports.forEach((s, i) => {
        const active = i === sel;
        const arrow = active ? colors[i] + " → " + R : "   ";
        const label = active
          ? BOLD + colors[i] + "  ▶  " + s + "  " + R
          : MUTED + "     " + s + "  " + R;
        print(center(arrow + label));
        print("");
      });

      print(center(MUTED + "[↑↓] navigate   [Enter] select   [q] quit" + R));
    }

    draw();
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function onKey(key) {
      // Buffer escape sequences for arrow keys
      if (escBuf.length > 0) {
        escBuf += key;
        if (escTimer) { clearTimeout(escTimer); escTimer = null; }
        if (escBuf === "\x1b[A" || escBuf === "\x1b[B" ||
            escBuf === "\x1b[C" || escBuf === "\x1b[D") {
          const seq = escBuf;
          escBuf = "";
          if (seq === "\x1b[A") { sel = (sel - 1 + sports.length) % sports.length; draw(); }
          else if (seq === "\x1b[B") { sel = (sel + 1) % sports.length; draw(); }
          return;
        }
        if (escBuf.length >= 3) { escBuf = ""; return; }
        escTimer = setTimeout(() => { escBuf = ""; }, 100);
        return;
      }

      if (key === "\x1b") {
        escBuf = "\x1b";
        escTimer = setTimeout(() => { escBuf = ""; }, 100);
        return;
      }

      if (key === "\x1b[A" || key === "k") { sel = (sel - 1 + sports.length) % sports.length; draw(); }
      else if (key === "\x1b[B" || key === "j") { sel = (sel + 1) % sports.length; draw(); }
      else if (key === "\r" || key === "\n") {
        process.stdin.removeListener("data", onKey);
        resolve(sports[sel]);
      }
      else if (key === "q" || key === "\x03") { cleanup(); process.exit(0); }
    }
    process.stdin.on("data", onKey);
  });
}

// ─── Generic list navigator ───────────────────────────────────
async function pickFromList(items, renderFn, getState) {
  let sel = 0;
  let numberBuf = "";      // Buffer for multi-digit number entry
  let numberTimer = null;  // Timer to clear stale buffer
  let escBuf = "";         // Buffer for escape sequences (arrow keys)
  let escTimer = null;     // Timer to clear incomplete escape sequences

  return new Promise(resolve => {
    function draw() {
      renderFn(items, sel);
      // Show number input prompt if user is typing a number
      if (numberBuf.length > 0) {
        process.stdout.write(CYAN + "  → Enter match #: " + BOLD + WHITE + numberBuf + MUTED + "_ " + R + MUTED + " (press Enter to confirm, Esc to cancel)" + R + "\n");
      }
    }
    draw();

    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function clearNumberBuf() {
      if (numberTimer) { clearTimeout(numberTimer); numberTimer = null; }
      numberBuf = "";
    }

    function onKey(key) {
      // ── Handle escape sequences for arrow keys ──
      // On some terminals (especially Windows), escape sequences may arrive
      // as separate data events: \x1b, then [, then A/B/C/D.
      // We buffer them to reconstruct the full sequence.
      if (escBuf.length > 0) {
        escBuf += key;
        if (escTimer) { clearTimeout(escTimer); escTimer = null; }
        // Check if we have a complete arrow sequence
        if (escBuf === "\x1b[A" || escBuf === "\x1b[B" ||
            escBuf === "\x1b[C" || escBuf === "\x1b[D" ||
            escBuf === "\x1b[5" || escBuf === "\x1b[6" ||
            escBuf === "\x1b[H" || escBuf === "\x1b[F") {
          const seq = escBuf;
          escBuf = "";
          if (seq === "\x1b[A") { sel = Math.max(0, sel - 1); draw(); }
          else if (seq === "\x1b[B") { sel = Math.min(items.length - 1, sel + 1); draw(); }
          else if (seq === "\x1b[H") { sel = 0; draw(); }            // Home
          else if (seq === "\x1b[F") { sel = items.length - 1; draw(); } // End
          // Left/Right ignored
          return;
        }
        // Page Up / Page Down (\x1b[5~ and \x1b[6~)
        if (escBuf === "\x1b[5~") { escBuf = ""; sel = Math.max(0, sel - 10); draw(); return; }
        if (escBuf === "\x1b[6~") { escBuf = ""; sel = Math.min(items.length - 1, sel + 10); draw(); return; }
        // If buffer is 3+ chars and not a known sequence, discard
        if (escBuf.length >= 4) { escBuf = ""; return; }
        // Still waiting for more chars
        escTimer = setTimeout(() => { escBuf = ""; }, 100);
        return;
      }

      // Start of escape sequence
      if (key === "\x1b") {
        // Could be Esc key alone or start of arrow sequence
        // If user is in number entry mode, Esc cancels
        escBuf = "\x1b";
        escTimer = setTimeout(() => {
          // Timeout: this was just the Esc key, not an arrow
          escBuf = "";
          if (numberBuf.length > 0) {
            clearNumberBuf();
            draw();
          }
        }, 100);
        return;
      }

      // Full escape sequences arriving as single data event (common case)
      if (key === "\x1b[A" || key === "k") { sel = Math.max(0, sel - 1); draw(); return; }
      if (key === "\x1b[B" || key === "j") { sel = Math.min(items.length - 1, sel + 1); draw(); return; }

      // Enter — select current or buffered number
      if (key === "\r" || key === "\n") {
        if (numberBuf.length > 0) {
          const idx = parseInt(numberBuf, 10) - 1;
          clearNumberBuf();
          if (idx >= 0 && idx < items.length) {
            process.stdin.removeListener("data", onKey);
            resolve({ action: "select", item: items[idx] });
          } else {
            // Invalid number — redraw with cleared buffer
            draw();
          }
        } else {
          process.stdin.removeListener("data", onKey);
          resolve({ action: "select", item: items[sel] });
        }
        return;
      }

      // Back
      if ((key === "b" || key === "B") && numberBuf.length === 0) {
        process.stdin.removeListener("data", onKey);
        resolve({ action: "back" });
        return;
      }

      // Quit
      if ((key === "q" || key === "\x03") && numberBuf.length === 0) {
        cleanup(); process.exit(0);
      }

      // Refresh (r) - redraw
      if ((key === "r" || key === "R") && numberBuf.length === 0) {
        draw(); return;
      }

      // Number input — buffer digits, require Enter to confirm
      if (key.length === 1 && /\d/.test(key)) {
        // Don't allow leading zero
        if (numberBuf.length === 0 && key === "0") return;
        // Cap at 3 digits (supports up to 999 matches)
        if (numberBuf.length >= 3) return;
        numberBuf += key;
        // Reset the stale buffer timer (auto-clear after 5 seconds of no input)
        if (numberTimer) clearTimeout(numberTimer);
        numberTimer = setTimeout(() => { numberBuf = ""; draw(); }, 5000);
        draw();
        return;
      }

      // Backspace — remove last digit from number buffer
      if (key === "\x7f" || key === "\b") {
        if (numberBuf.length > 0) {
          numberBuf = numberBuf.slice(0, -1);
          if (numberTimer) clearTimeout(numberTimer);
          if (numberBuf.length > 0) {
            numberTimer = setTimeout(() => { numberBuf = ""; draw(); }, 5000);
          }
          draw();
        }
        return;
      }
    }
    process.stdin.on("data", onKey);
  });
}

// ─── Detail view with auto-refresh ───────────────────────────
async function showDetail(fetchFn, renderFn, matchItem) {
  let refreshIn = 60;
  let match = null;
  let refreshTimer = null;
  let countTimer = null;

  async function load() {
    try {
      match = await fetchFn(matchItem);
    } catch (e) {
      match = null;
    }
  }

  function draw() {
    if (!match) {
      process.stdout.write(CLEAR);
      process.stdout.write(RED + "\n  Error loading match data. Press [r] to retry or [b] to go back.\n" + R + "\n");
      return;
    }
    // Always jump to top and overwrite — never append
    process.stdout.write(CLEAR);
    renderFn(matchItem, match, refreshIn);
  }

  function startCountdown() {
    clearInterval(countTimer);
    refreshIn = 60;
    countTimer = setInterval(() => {
      refreshIn = Math.max(0, refreshIn - 1);
      // Redraw every 10s so countdown stays accurate without appending
      if (refreshIn % 10 === 0 && match) draw();
    }, 1000);
  }

  function startAutoRefresh() {
    clearInterval(refreshTimer);
    refreshTimer = setInterval(async () => {
      await load();
      draw();
      startCountdown();
    }, 60000);
  }

  await load();
  draw();
  startCountdown();
  if (match?.state === "In Progress") startAutoRefresh();

  return new Promise(resolve => {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");

    function onKey(key) {
      if (key === "b" || key === "B") {
        clearInterval(refreshTimer);
        clearInterval(countTimer);
        process.stdin.removeListener("data", onKey);
        resolve("back");
      }
      else if (key === "r" || key === "R") {
        clearInterval(refreshTimer);
        clearInterval(countTimer);
        cls();
        print(MUTED + "\n  Refreshing...\n" + R);
        load().then(() => { draw(); startCountdown(); if (match?.state === "In Progress") startAutoRefresh(); });
      }
      else if (key === "q" || key === "\x03") { cleanup(); process.exit(0); }
    }
    process.stdin.on("data", onKey);
  });
}

// ─── Cricket fetch wrapper ────────────────────────────────────
async function fetchCricketMatchItem(item) {
  return fetchCricketMatch(item.id, item.slug);
}
async function fetchFootballMatchItem(item) {
  return fetchFootballMatch(item.id);
}
async function fetchBasketballMatchItem(item) {
  return fetchBasketballMatch(item.id);
}

// ─── Sport flows ─────────────────────────────────────────────
async function cricketFlow() {
  cls();
  await playAnimation(CRICKET_FRAMES, CRICKET_DELAYS, cricketColorFn, CRICKET_BANNER, GREEN);

  while (true) {
    cls();
    print(MUTED + "\n  Loading cricket matches...\n" + R);
    let matches;
    try {
      matches = await fetchCricketList();
    } catch (e) {
      cls();
      print(RED + "\n  Failed to load cricket matches: " + e.message + "\n" + R);
      print(MUTED + "  Press any key to go back." + R);
      await new Promise(r => { process.stdin.once("data", r); });
      return;
    }

    if (!matches.length) {
      cls();
      print(AMBER + "\n  No cricket matches found right now.\n" + R);
      print(MUTED + "  Press any key to go back." + R);
      await new Promise(r => { process.stdin.once("data", r); });
      return;
    }

    const result = await pickFromList(matches, renderCricketList, m => m.state);
    if (result.action === "back") return;

    const back = await showDetail(fetchCricketMatchItem, renderCricketDetail, result.item);
    if (back === "back") continue;
    return;
  }
}

async function footballFlow() {
  cls();
  await playAnimation(FOOTBALL_FRAMES, FOOTBALL_DELAYS, footballColorFn, FOOTBALL_BANNER, GREEN);

  while (true) {
    cls();
    print(MUTED + "\n  Loading football matches...\n" + R);
    let matches;
    try {
      matches = await fetchFootballList();
    } catch (e) {
      cls();
      print(RED + "\n  Failed to load football matches: " + e.message + "\n" + R);
      print(MUTED + "  Press any key to go back." + R);
      await new Promise(r => { process.stdin.once("data", r); });
      return;
    }

    if (!matches.length) {
      cls();
      print(AMBER + "\n  No football matches found right now.\n" + R);
      print(MUTED + "  Press any key to go back." + R);
      await new Promise(r => { process.stdin.once("data", r); });
      return;
    }

    const result = await pickFromList(matches, renderFootballList, m => m.state);
    if (result.action === "back") return;

    const back = await showDetail(fetchFootballMatchItem, renderFootballDetail, result.item);
    if (back === "back") continue;
    return;
  }
}

async function basketballFlow() {
  cls();
  await playAnimation(BASKETBALL_FRAMES, BASKETBALL_DELAYS, basketballColorFn, BASKETBALL_BANNER, ORANGE);

  while (true) {
    cls();
    print(MUTED + "\n  Loading NBA matches...\n" + R);
    let matches;
    try {
      matches = await fetchBasketballList();
    } catch (e) {
      cls();
      print(RED + "\n  Failed to load NBA matches: " + e.message + "\n" + R);
      print(MUTED + "  Press any key to go back." + R);
      await new Promise(r => { process.stdin.once("data", r); });
      return;
    }

    if (!matches.length) {
      cls();
      print(AMBER + "\n  No NBA matches found right now.\n" + R);
      print(MUTED + "  Press any key to go back." + R);
      await new Promise(r => { process.stdin.once("data", r); });
      return;
    }

    const result = await pickFromList(matches, renderBasketballList, m => m.state);
    if (result.action === "back") return;

    const back = await showDetail(fetchBasketballMatchItem, renderBasketballDetail, result.item);
    if (back === "back") continue;
    return;
  }
}

// ─── Cleanup ──────────────────────────────────────────────────
function cleanup() {
  try {
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }
  } catch {}
  process.stdout.write(SHOW_CURSOR + R + "\n");
}

// ─── Main loop ────────────────────────────────────────────────
async function main() {
  // Check Node version
  const [major] = process.versions.node.split(".").map(Number);
  if (major < 18) {
    console.error("ScoreShell requires Node.js >= 18 (for native fetch). You have: " + process.version);
    process.exit(1);
  }

  process.stdout.write(HIDE_CURSOR);

  process.on("SIGINT", () => { cleanup(); process.exit(0); });
  process.on("SIGTERM", () => { cleanup(); process.exit(0); });
  process.on("exit", cleanup);

  while (true) {
    const sport = await renderSportSelector();
    if (sport === "CRICKET") await cricketFlow();
    else if (sport === "FOOTBALL") await footballFlow();
    else if (sport === "BASKETBALL") await basketballFlow();
  }
}

main().catch(e => { cleanup(); console.error(e); process.exit(1); });
