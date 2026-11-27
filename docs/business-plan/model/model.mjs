#!/usr/bin/env node
// AnimeWho — modèle financier sur 36 mois (BUSINESS_PLAN.md §9 et annexe B).
//
// Usage :
//   node docs/business-plan/model/model.mjs            # hypothèses actuelles (budget zéro, révision 27/11/2026)
//   node docs/business-plan/model/model.mjs --v1       # hypothèses de la version 1.0 (29/10/2026), pour contrôle
//   node docs/business-plan/model/model.mjs --json     # dump JSON (contrôles automatiques)
//
// Méthode (annexe B) : simulation jour par jour des cohortes d'installations ;
// rétention en loi de puissance r(d) = J1 × d^(−b), b = ln(J1/J30)/ln(30), r(0) = 1 ;
// DAU(t) = Σ installations(s) × r(t − s). Les revenus et coûts sont calculés par mois
// (M1 = novembre 2026), puis sommés par année. Aucune valeur n'est recopiée à la main.
//
// Aucune dépendance : Node ≥ 18.
//
// Contrôle de reconstruction (le script d'origine a été perdu) : avec --v1, le modèle
// retrouve les coûts publiés à l'euro près et les revenus à moins de 0,5 % près
// (DAU de fin d'année à moins de 2 %, besoin de financement médian 49 843 € contre 49 890 €).
// Les écarts viennent de détails non documentés de la v1 (convention exacte du « DAU de fin de
// mois », bornes des jours). Le seuil RevenueCat de 2 500 $ est pris à 2 300 € : c'est la
// valeur qui retrouve les « Outils » publiés. Différence de lecture : la v1 annonçait le médian
// « rentable chaque mois à partir de M16 » ; M16 est en fait le PREMIER mois bénéficiaire, les
// mois de juillet (convention à 1 500 €) repassant en perte jusqu'à M21.

const MONTHS = 36;
const LAUNCH = 4; // M4 = février 2027 : premier mois de revenus et d'installations
const START_YEAR = 2026;
const START_MONTH = 10; // 0-based : novembre
const NET_STORE = 0.85 / 1.2; // TTC ÷ 1,2 (TVA) × 0,85 (commission 15 %) = 0,7083
const DAYS_PER_MONTH_REV = 30.4;
const MONTH_NAMES = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

// ---------------------------------------------------------------------------
// Hypothèses
// ---------------------------------------------------------------------------

// Version 1.0 (29/10/2026) : budget d'environ 50 k€, illustrateurs, freelance Flutter,
// marketing payant. Conservée pour vérifier que le modèle reconstruit retrouve
// les chiffres publiés.
const COMMON_V1 = {
  dev: { pre: 5000, post: 1500 },
  art: { pre: 2000, post: 700 },
  legal: { m1: 3000, yearly: 500 },
  admin: { m1: 300, monthly: 100 }, // 300 € à M1, puis 100 €/mois à partir du lancement
  infra: { pre: 20, fixed: 40, perDau: 0.004 },
  tools: { pre: 10, post: 30 },
  storeAccounts: { m1: 115, yearly: 92 },
  launchMarketing: 3000,
  conventionJuly: 1500,
  revenueCatThreshold: 2300, // gratuit sous 2 500 $ (≈ 2 300 €) de revenu brut mensuel, puis 1 % du total
  cashLagMonths: 0,
};

const V1 = {
  prudent: {
    label: "Prudent",
    organic: [3000, 5500, 7500], launchMult: 2,
    paid: [0, 0, 0], cpi: 1.5,
    j1: 0.25, j30: 0.025, dauMau: 0.15,
    ecpm: [5, 3, 0.3], impr: [0.5, 0.9, 2], noAds: 0.01,
    payConv: 0.008, spend: 4, subRate: 0.002, passRate: 0.004,
    sponsor: [0, 0, 0], marketing: [300, 300, 400], team: [0, 0, 0],
    ...COMMON_V1,
  },
  median: {
    label: "Médian",
    organic: [11000, 24000, 40000], launchMult: 2.5,
    paid: [300, 500, 800], cpi: 1.2,
    j1: 0.30, j30: 0.04, dauMau: 0.18,
    ecpm: [7, 4.5, 0.4], impr: [0.6, 1.0, 2], noAds: 0.015,
    payConv: 0.015, spend: 5, subRate: 0.004, passRate: 0.008,
    sponsor: [0, 300, 1000], marketing: [800, 1200, 1500], team: [0, 0, 1000],
    ...COMMON_V1,
  },
  optimiste: {
    label: "Optimiste",
    organic: [32000, 80000, 160000], launchMult: 3,
    paid: [1000, 2000, 3000], cpi: 1.0,
    j1: 0.38, j30: 0.06, dauMau: 0.20,
    ecpm: [9, 6, 0.5], impr: [0.7, 1.1, 2], noAds: 0.02,
    payConv: 0.025, spend: 6, subRate: 0.007, passRate: 0.012,
    sponsor: [0, 1000, 3000], marketing: [1500, 2500, 4000], team: [0, 6000, 11000],
    ...COMMON_V1,
  },
};
V1.prudentRepli = {
  ...V1.prudent,
  label: "Prudent + plan de repli (dès M10)",
  repli: { from: 10, dev: 400, art: 200, marketing: 150 },
};

// Révision du 27/11/2026 : budget de départ ZÉRO.
// - comptes développeur déjà ouverts (Apple 99 $/an payé par ailleurs : hors modèle) ;
// - casting et cosmétiques produits en interne (portraits SVG générés par code) : 0 € ;
// - développement par le fondateur (app Flutter déjà écrite), aucun salaire : 0 € ;
// - aucune acquisition ni marketing payant, pas de convention, pas de juriste : 0 € ;
// - outils sur offres gratuites (Firebase, AdMob, Sentry/UptimeRobot gratuits) ;
//   RevenueCat reste gratuit sous 2 500 $ de revenu mensuel, puis 1 % ;
// - seul coût : l'hébergement. Hypothèse de base = VPS dans l'UE avec Postgres sur la
//   même machine (≈ 8 €/mois, sauvegardes comprises), + 0,004 € par DAU et par mois au-delà
//   (montée en gamme de la machine). Compté dès M1 : le serveur doit être en ligne pour la
//   bêta et la revue des stores (et la version web tourne déjà). Une offre gratuite (annexe D)
//   ramène ce poste à 0 €, avec des limites.
// - croissance purement organique (aucun euro de marketing) : installations revues à la baisse ;
//   rétention J1 −2 pts et J30 −0,5 pt (prudent, médian) pour le style visuel plus simple ;
// - encaissement décalé de 2 mois (AdMob paie vers le 21 du mois suivant au-delà de 100 $,
//   Apple ≈ 33 jours après la fin du mois fiscal, Google le 15 du mois suivant) : sans
//   trésorerie de départ, ce décalage compte.
const COMMON_V2 = {
  dev: { pre: 0, post: 0 },
  art: { pre: 0, post: 0 },
  legal: { m1: 0, yearly: 0 },
  admin: { m1: 0, monthly: 0 },
  infra: { pre: 8, fixed: 8, perDau: 0.004 },
  tools: { pre: 0, post: 0 },
  storeAccounts: { m1: 0, yearly: 0 },
  launchMarketing: 0,
  conventionJuly: 0,
  revenueCatThreshold: 2300,
  cashLagMonths: 2,
};

const V2 = {
  prudent: {
    label: "Prudent",
    organic: [1500, 2500, 3500], launchMult: 1.5,
    paid: [0, 0, 0], cpi: 1.5,
    j1: 0.23, j30: 0.02, dauMau: 0.15,
    ecpm: [5, 3, 0.3], impr: [0.5, 0.9, 2], noAds: 0.01,
    payConv: 0.008, spend: 4, subRate: 0.002, passRate: 0.004,
    sponsor: [0, 0, 0], marketing: [0, 0, 0], team: [0, 0, 0],
    ...COMMON_V2,
  },
  median: {
    label: "Médian",
    organic: [5000, 11000, 18000], launchMult: 2,
    paid: [0, 0, 0], cpi: 1.2,
    j1: 0.28, j30: 0.035, dauMau: 0.18,
    ecpm: [7, 4.5, 0.4], impr: [0.6, 1.0, 2], noAds: 0.015,
    payConv: 0.015, spend: 5, subRate: 0.004, passRate: 0.008,
    sponsor: [0, 0, 500], marketing: [0, 0, 0], team: [0, 0, 0],
    ...COMMON_V2,
  },
  optimiste: {
    label: "Optimiste",
    organic: [15000, 40000, 80000], launchMult: 2.5,
    paid: [0, 0, 0], cpi: 1.0,
    j1: 0.36, j30: 0.055, dauMau: 0.20,
    ecpm: [9, 6, 0.5], impr: [0.7, 1.1, 2], noAds: 0.02,
    payConv: 0.025, spend: 6, subRate: 0.007, passRate: 0.012,
    sponsor: [0, 500, 2000], marketing: [0, 0, 0], team: [0, 0, 0],
    ...COMMON_V2,
  },
};

// ---------------------------------------------------------------------------
// Moteur
// ---------------------------------------------------------------------------

function monthInfo(m) {
  // m : 1..36
  const idx = START_MONTH + (m - 1);
  const year = START_YEAR + Math.floor(idx / 12);
  const month = idx % 12;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return { year, month, days, label: `${MONTH_NAMES[month]} ${year}` };
}

function retentionCurve(j1, j30, maxDay) {
  const b = Math.log(j1 / j30) / Math.log(30);
  const r = new Float64Array(maxDay + 1);
  r[0] = 1;
  for (let d = 1; d <= maxDay; d++) r[d] = j1 * Math.pow(d, -b);
  return { r, b };
}

export function simulate(s) {
  const months = Array.from({ length: MONTHS }, (_, i) => ({ m: i + 1, ...monthInfo(i + 1) }));
  const totalDays = months.reduce((a, x) => a + x.days, 0);
  const { r, b } = retentionCurve(s.j1, s.j30, totalDays);

  // Installations quotidiennes
  const installsDaily = new Float64Array(totalDays);
  let day = 0;
  for (const mo of months) {
    const y = Math.floor((mo.m - 1) / 12);
    let inst = 0;
    if (mo.m >= LAUNCH) {
      inst = s.organic[y] * (mo.m === LAUNCH ? s.launchMult : 1) + s.paid[y] / s.cpi;
    }
    mo.installs = inst;
    mo.firstDay = day;
    for (let d = 0; d < mo.days; d++) installsDaily[day + d] = inst / mo.days;
    day += mo.days;
  }

  // DAU quotidien par convolution
  const dau = new Float64Array(totalDays);
  for (let t = 0; t < totalDays; t++) {
    let sum = 0;
    for (let sd = 0; sd <= t; sd++) {
      const v = installsDaily[sd];
      if (v) sum += v * r[t - sd];
    }
    dau[t] = sum;
  }

  let cash = 0;
  let minCash = 0, minCashMonth = 0;
  const pnlCash = []; // résultat mensuel, pour le décalage d'encaissement
  for (const mo of months) {
    const y = Math.floor((mo.m - 1) / 12);
    const launched = mo.m >= LAUNCH;
    let dsum = 0;
    for (let d = 0; d < mo.days; d++) dsum += dau[mo.firstDay + d];
    mo.dauAvg = dsum / mo.days;
    mo.dauEnd = dau[mo.firstDay + mo.days - 1];
    mo.mau = mo.dauAvg / s.dauMau;
    mo.mauEnd = mo.dauEnd / s.dauMau;
    mo.peak = mo.dauEnd * 15 / 1440 * 3;

    // Revenus
    const [eR, eI, eB] = s.ecpm;
    const [iR, iI, iB] = s.impr;
    mo.ads = launched
      ? mo.dauAvg * DAYS_PER_MONTH_REV * (iR * eR + (1 - s.noAds) * (iI * eI + iB * eB)) / 1000
      : 0;
    mo.iap = launched ? mo.mau * s.payConv * s.spend * NET_STORE : 0;
    mo.sub = mo.m >= 10 ? mo.mau * s.subRate * 2.49 * NET_STORE : 0;
    mo.pass = mo.m >= 16 ? mo.mau * s.passRate * 4.99 / 2 * NET_STORE : 0;
    mo.sponsor = launched ? s.sponsor[y] : 0;
    mo.revenue = mo.ads + mo.iap + mo.sub + mo.pass + mo.sponsor;
    mo.storeGross = (mo.iap + mo.sub + mo.pass) / NET_STORE;

    // Coûts
    const repli = s.repli && mo.m >= s.repli.from ? s.repli : null;
    mo.dev = mo.m < LAUNCH ? s.dev.pre : (repli ? repli.dev : s.dev.post);
    mo.art = mo.m < LAUNCH ? s.art.pre : (repli ? repli.art : s.art.post);
    mo.team = s.team[y];
    let mkt = launched ? (repli ? repli.marketing : s.marketing[y]) : 0;
    if (mo.m === LAUNCH) mkt += s.launchMarketing;
    if (mo.month === 6 && !(repli && mo.m > 12)) mkt += s.conventionJuly; // juillet
    const acq = launched && !repli ? s.paid[y] : 0;
    mo.marketing = mkt + acq;
    mo.infra = launched ? s.infra.fixed + s.infra.perDau * mo.dauAvg : s.infra.pre;
    mo.tools = (launched ? s.tools.post : s.tools.pre)
      + (mo.storeGross > s.revenueCatThreshold ? 0.01 * mo.storeGross : 0);
    mo.accounts = mo.m === 1 ? s.storeAccounts.m1 : ((mo.m - 1) % 12 === 0 ? s.storeAccounts.yearly : 0);
    mo.legal = mo.m === 1 ? s.legal.m1 : ((mo.m - 1) % 12 === 0 ? s.legal.yearly : 0);
    mo.admin = (mo.m === 1 ? s.admin.m1 : 0) + (launched ? s.admin.monthly : 0);
    mo.costs = mo.dev + mo.art + mo.team + mo.marketing + mo.infra + mo.tools + mo.accounts + mo.legal + mo.admin;
    mo.result = mo.revenue - mo.costs;

    // Trésorerie : coûts payés dans le mois, revenus encaissés avec un décalage
    pnlCash.push(mo.revenue);
    const lag = s.cashLagMonths || 0;
    const cashIn = mo.m - 1 - lag >= 0 ? pnlCash[mo.m - 1 - lag] : 0;
    cash += cashIn - mo.costs;
    mo.cash = cash;
    if (cash < minCash) { minCash = cash; minCashMonth = mo.m; }
  }

  // Agrégats annuels
  const years = [0, 1, 2].map((y) => {
    const ms = months.slice(y * 12, y * 12 + 12);
    const sum = (k) => ms.reduce((a, x) => a + x[k], 0);
    const last = ms[11];
    const dauDays = ms.reduce((a, x) => a + x.dauAvg * DAYS_PER_MONTH_REV, 0);
    const store = sum("revenue") - sum("sponsor");
    return {
      installs: sum("installs"),
      dauAvg: sum("dauAvg") / 12,
      dauEnd: last.dauEnd,
      mauEnd: last.mauEnd,
      peak: last.peak,
      arpdau: dauDays ? store / dauDays : 0,
      ads: sum("ads"), iap: sum("iap"), sub: sum("sub"), pass: sum("pass"), sponsor: sum("sponsor"),
      revenue: sum("revenue"),
      dev: sum("dev"), art: sum("art"), team: sum("team"), marketing: sum("marketing"),
      infra: sum("infra"), tools: sum("tools"), accounts: sum("accounts"), legal: sum("legal"), admin: sum("admin"),
      costs: sum("costs"), result: sum("result"), cashEnd: last.cash,
    };
  });
  let cum = 0;
  for (const y of years) { cum += y.installs; y.installsCum = cum; }

  const firstProfit = months.find((x) => x.m >= LAUNCH && x.result > 0);
  // « Premier mois bénéficiaire » au sens « rentable chaque mois à partir de » :
  let profitableFrom = null;
  for (let i = MONTHS - 1; i >= 0; i--) {
    if (months[i].result > 0) profitableFrom = months[i]; else break;
  }
  const cashPositive = months.find((x, i) => x.cash > 0 && months.slice(i).every((z) => z.cash > 0));

  // LTV et durée de vie
  let life = 1;
  for (let d = 1; d <= 365; d++) life += r[d];
  const arpdau3 = years[2].arpdau;
  const m36 = months[MONTHS - 1];
  const arpdauM36 = (m36.revenue - m36.sponsor) / (m36.dauAvg * DAYS_PER_MONTH_REV);
  const breakEvenDau = Math.max(0, m36.costs - m36.sponsor) / (arpdauM36 * DAYS_PER_MONTH_REV);
  // Repères sans sponsoring : DAU pour couvrir les coûts de M36, et pour dégager en plus
  // 1 500 €/mois (ordre de grandeur d'une rémunération modeste, avant charges et impôt).
  const breakEvenDauNoSponsor = m36.costs / (arpdauM36 * DAYS_PER_MONTH_REV);
  const dauFor1500 = (m36.costs + 1500) / (arpdauM36 * DAYS_PER_MONTH_REV);

  return {
    s, b, j7: s.j1 * Math.pow(7, -b), months, years,
    firstProfitMonth: firstProfit ? firstProfit.m : null,
    profitableFromMonth: profitableFrom ? profitableFrom.m : null,
    cashPositiveMonth: cashPositive ? cashPositive.m : null,
    fundingNeed: -minCash, fundingNeedMonth: minCashMonth,
    life, ltv: life * arpdau3, arpdauM36, costsM36: m36.costs, sponsorM36: m36.sponsor, breakEvenDau,
    breakEvenDauNoSponsor, dauFor1500,
  };
}

// ---------------------------------------------------------------------------
// Sortie Markdown
// ---------------------------------------------------------------------------

const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const fmt = (x) => nf0.format(Math.round(x)).replace(/ | /g, " ").replace("-", "−");
const fmt3 = (x) => x.toFixed(3).replace(".", ",");
const mlabel = (m) => (m ? `M${m} (${monthInfo(m).label})` : "jamais sur 36 mois");

function detailTable(res, title) {
  const Y = res.years;
  const row = (label, k, f = fmt, bold = false) => {
    const cells = Y.map((y) => (bold ? `**${f(y[k])}**` : f(y[k])));
    return `| ${bold ? `**${label}**` : label} | ${cells.join(" | ")} |`;
  };
  const lines = [
    `#### ${title}`, "",
    "| Indicateur | An 1 (M1-M12) | An 2 (M13-M24) | An 3 (M25-M36) |",
    "|---|---:|---:|---:|",
    row("Installations", "installs"),
    row("Installations cumulées (fin d'année)", "installsCum"),
    row("DAU moyen (moyenne des mois)", "dauAvg"),
    row("DAU en fin d'année (M12/M24/M36)", "dauEnd"),
    row("MAU en fin d'année", "mauEnd"),
    row("Pic de connexions simultanées (fin d'année)", "peak"),
    row("ARPDAU moyen hors sponsoring (€)", "arpdau", fmt3),
    row("Publicité (€)", "ads"),
    row("Achats intégrés ponctuels (€ nets)", "iap"),
    row("Abonnement AnimeWho+ (€ nets)", "sub"),
    row("Pass de saison (€ nets)", "pass"),
    row("Sponsoring / partenariats (€)", "sponsor"),
    row("Chiffre d'affaires net (€)", "revenue", fmt, true),
  ];
  const costRows = [
    ["Développement", "dev"], ["Art (portraits, cosmétiques)", "art"],
    ["Équipe salariée / community management", "team"], ["Marketing + acquisition payante", "marketing"],
    ["Hébergement (serveur + Postgres)", "infra"], ["Outils (RevenueCat au-delà du seuil gratuit…)", "tools"],
    ["Comptes développeur stores", "accounts"], ["Juridique", "legal"], ["Administratif", "admin"],
  ];
  for (const [label, k] of costRows) {
    if (Y.some((y) => Math.round(y[k]) !== 0)) lines.push(row(label, k));
  }
  lines.push(
    row("Total coûts (€)", "costs", fmt, true),
    row("Résultat avant impôt (€)", "result", fmt, true),
    row("Trésorerie cumulée fin d'année (€)", "cashEnd"),
    "",
    `1er mois bénéficiaire : ${res.firstProfitMonth ? "M" + res.firstProfitMonth : "aucun"} ; rentable chaque mois à partir de : ${res.profitableFromMonth ? "M" + res.profitableFromMonth : "jamais"} ; ` +
      `besoin de financement max : ${fmt(res.fundingNeed)} €${res.fundingNeed > 0 ? ` (M${res.fundingNeedMonth})` : ""} ; ` +
      `trésorerie cumulée > 0 à partir de : ${res.cashPositiveMonth ? "M" + res.cashPositiveMonth : "jamais sur 36 mois"}`,
    `Seuil (M36) : coûts mensuels ${fmt(res.costsM36)} € (sponsoring ${fmt(res.sponsorM36)} €) → DAU de rentabilité ≈ ${fmt(res.breakEvenDau)} ; sans sponsoring ≈ ${fmt(res.breakEvenDauNoSponsor)} (à l'ARPDAU M36 de ${fmt3(res.arpdauM36)} €)`,
    "",
  );
  return lines.join("\n");
}

function synthesis(results) {
  const R = results;
  const col = (f) => R.map(f).join(" | ");
  return [
    `| Indicateur | ${col((r) => r.s.label)} |`,
    `|---|${R.map(() => "---:").join("|")}|`,
    `| Installations cumulées à M36 | ${col((r) => fmt(r.years[2].installsCum))} |`,
    `| DAU fin An 1 / An 2 / An 3 | ${col((r) => r.years.map((y) => fmt(y.dauEnd)).join(" / "))} |`,
    `| Rétention J1 / J7 / J30 | ${col((r) => `${(r.s.j1 * 100).toFixed(0)} % / ${(r.j7 * 100).toFixed(1).replace(".", ",")} % / ${(r.s.j30 * 100).toFixed(1).replace(".", ",").replace(",0", "")} %`)} |`,
    `| ARPDAU An 3 (hors sponsoring) | ${col((r) => `≈ ${fmt3(r.years[2].arpdau)} €`)} |`,
    `| Jours actifs par installation sur 365 j | ${col((r) => r.life.toFixed(1).replace(".", ","))} |`,
    `| Valeur d'une installation sur 365 j (LTV) | ${col((r) => `≈ ${r.ltv.toFixed(2).replace(".", ",")} €`)} |`,
    `| CA net An 1 / An 2 / An 3 | ${col((r) => r.years.map((y) => fmt(y.revenue)).join(" / ") + " €")} |`,
    `| Coûts An 1 / An 2 / An 3 | ${col((r) => r.years.map((y) => fmt(y.costs)).join(" / ") + " €")} |`,
    `| Résultat An 1 / An 2 / An 3 | ${col((r) => r.years.map((y) => (y.result >= 0 ? "+" : "") + fmt(y.result)).join(" / ") + " €")} |`,
    `| Rentable chaque mois à partir de | ${col((r) => mlabel(r.profitableFromMonth))} |`,
    `| Besoin de financement maximal (creux de trésorerie) | ${col((r) => `${fmt(r.fundingNeed)} €${r.fundingNeed > 0 ? ` (M${r.fundingNeedMonth})` : ""}`)} |`,
    `| Trésorerie cumulée à M36 | ${col((r) => (r.years[2].cashEnd >= 0 ? "+" : "") + fmt(r.years[2].cashEnd) + " €")} |`,
    `| DAU de rentabilité (coûts M36, hors sponsoring) | ${col((r) => `≈ ${fmt(r.breakEvenDauNoSponsor)}`)} |`,
    `| DAU pour dégager en plus 1 500 €/mois (avant charges) | ${col((r) => `≈ ${fmt(r.dauFor1500)}`)} |`,
    "",
  ].join("\n");
}

function sensitivity(base) {
  const variants = [
    ["Base", {}],
    ["eCPM −30 %", { ecpm: base.ecpm.map((x) => x * 0.7) }],
    ["eCPM +30 %", { ecpm: base.ecpm.map((x) => x * 1.3) }],
    ["Conversion en payeur divisée par 2", { payConv: base.payConv / 2 }],
    ["Installations −30 %", { organic: base.organic.map((x) => x * 0.7), paid: base.paid.map((x) => x * 0.7) }],
    ["Installations +30 %", { organic: base.organic.map((x) => x * 1.3), paid: base.paid.map((x) => x * 1.3) }],
    [`Rétention J30 −1 pt (${((base.j30 - 0.01) * 100).toFixed(1).replace(".", ",")} %)`, { j30: base.j30 - 0.01 }],
    ["Hébergement Replit actuel (≈ 45 €/mois au lieu de 8 €)", { infra: { ...base.infra, pre: 45, fixed: 45 } }],
    ["Hébergement gratuit (0 € fixe)", { infra: { ...base.infra, pre: 0, fixed: 0 } }],
  ];
  const lines = [
    "| Variation (toutes choses égales par ailleurs) | Résultat An 1 | Résultat An 3 | Trésorerie cumulée M36 | Rentable chaque mois à partir de |",
    "|---|---:|---:|---:|---:|",
  ];
  for (const [label, patch] of variants) {
    const r = simulate({ ...base, ...patch });
    const sg = (x) => (x >= 0 ? "+" : "") + fmt(x) + " €";
    lines.push(`| ${label} | ${sg(r.years[0].result)} | ${sg(r.years[2].result)} | ${sg(r.years[2].cashEnd)} | ${r.profitableFromMonth ? "M" + r.profitableFromMonth : "jamais"} |`);
  }
  return lines.join("\n") + "\n";
}

function reinvestCapacity(res, amount) {
  // Premier mois où la trésorerie cumulée couvre `amount` + 3 mois de coûts courants.
  const mo = res.months.find((x) => x.cash >= amount + 3 * x.costs);
  return mo ? mo.m : null;
}

// ---------------------------------------------------------------------------

const args = new Set(process.argv.slice(2));
const set = args.has("--v1") ? V1 : V2;
const keys = args.has("--v1") ? ["prudent", "prudentRepli", "median", "optimiste"] : ["prudent", "median", "optimiste"];
const results = keys.map((k) => simulate(set[k]));

if (args.has("--json")) {
  console.log(JSON.stringify(results.map((r) => ({
    label: r.s.label, years: r.years, fundingNeed: r.fundingNeed, fundingNeedMonth: r.fundingNeedMonth,
    profitableFromMonth: r.profitableFromMonth, firstProfitMonth: r.firstProfitMonth,
    cashPositiveMonth: r.cashPositiveMonth, breakEvenDau: r.breakEvenDau, ltv: r.ltv, life: r.life,
    monthly: r.months.map((m) => ({ m: m.m, installs: m.installs, dauAvg: m.dauAvg, dauEnd: m.dauEnd, revenue: m.revenue, costs: m.costs, cash: m.cash })),
  })), null, 1));
} else {
  console.log(`# Modèle AnimeWho — ${args.has("--v1") ? "hypothèses v1.0 (29/10/2026)" : "hypothèses révisées (budget zéro, 27/11/2026)"}\n`);
  console.log("## Synthèse\n");
  console.log(synthesis(results));
  console.log("## Tableaux détaillés\n");
  for (const r of results) console.log(detailTable(r, r.s.label));
  const med = set.median;
  console.log("## Sensibilité du scénario médian\n");
  console.log(sensitivity(med));
  if (!args.has("--v1")) {
    console.log("## Capacité d'autofinancement (illustrations payantes, phase 2/3)\n");
    console.log("| Scénario | Trésorerie ≥ 6 000 € + 3 mois de coûts à partir de |");
    console.log("|---|---:|");
    for (const r of results) console.log(`| ${r.s.label} | ${mlabel(reinvestCapacity(r, 6000))} |`);
    console.log("");
  }
}
