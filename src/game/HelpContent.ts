import { RANK_THRESHOLDS } from "./Rank";

export type HelpSectionId =
  | "quickStart"
  | "controls"
  | "coreLoop"
  | "flight"
  | "docking"
  | "trading"
  | "missions"
  | "map"
  | "ships"
  | "equipment"
  | "stations"
  | "combat"
  | "rank"
  | "reputation"
  | "legalRisk"
  | "saveLoad"
  | "demoNotes";

export type HelpPage = {
  heading: string;
  body: string[];
  tips?: string[];
  related?: HelpSectionId[];
};

export type HelpSection = {
  id: HelpSectionId;
  title: string;
  summary: string;
  pages: HelpPage[];
};

export const SCREEN_HELP_SECTIONS: Record<string, HelpSectionId> = {
  start: "quickStart",
  controls: "controls",
  flight: "flight",
  docking: "docking",
  docked: "stations",
  trade: "trading",
  missions: "missions",
  map: "map",
  equipment: "equipment",
  shipyard: "ships",
  paused: "saveLoad",
  settings: "saveLoad",
  gameOver: "demoNotes",
  help: "quickStart"
};

export const HELP_CONTENT: HelpSection[] = [
  {
    id: "quickStart",
    title: "Quick Start",
    summary: "Your first 5 minutes in the sector.",
    pages: [
      {
        heading: "Initialization",
        body: [
          "Launch from First Berth to begin your journey.",
          "Use W/S to manage throttle and Arrow keys to steer.",
          "Approach the station and press D to dock when in range."
        ],
        tips: ["Docking is free and refills your oxygen systems."]
      },
      {
        heading: "First Trade",
        body: [
          "Open the Market [T] while docked.",
          "Buy low-cost commodities like Grain or Minerals.",
          "Jump to a nearby system [M] to find a better sell price."
        ],
        tips: ["Check the price trend indicators in the market panel."]
      }
    ]
  },
  {
    id: "controls",
    title: "Controls",
    summary: "State-accurate operational inputs.",
    pages: [
      {
        heading: "Flight Mode",
        body: [
          "ARROWS / WASD — Pitch and Yaw",
          "Q / E — Roll control",
          "W / S — Throttle adjustment",
          "SPACE — Fire active laser",
          "D — Dock / Launch command",
          "M — Universe Map toggle"
        ],
        tips: ["Touch controls are available on mobile-sized screens."]
      },
      {
        heading: "Station & Menu",
        body: [
          "T — Market Hub",
          "E — Equipment Bay",
          "Y — Shipyard",
          "R — Mission Board",
          "F — Quick Fuel (Market)",
          "H — Quick Repair (Equipment)",
          "ENTER — Confirm / Jump",
          "ESCAPE — Back / Pause"
        ],
        tips: ["Use N / P to cycle pages in the Equipment bay."]
      },
      {
        heading: "Controls by mode",
        body: [
          "R — Mission Board while docked; Restart after game over.",
          "D — Dock or launch in flight/station contexts; next manual page while the Pilot Manual is open; next system on the map.",
          "E — Roll right in flight; Equipment Bay while docked."
        ],
        tips: ["If a key appears in two places, the current mode decides which command runs."]
      }
    ]
  },
  {
    id: "coreLoop",
    title: "Core Loop",
    summary: "The path to becoming a legend.",
    pages: [
      {
        heading: "The Pilot's Life",
        body: [
          "Fly between systems to find the best trade routes.",
          "Complete missions for BAL and Reputation.",
          "Upgrade your ship's equipment to handle longer hauls.",
          "Purchase specialized hulls for specific roles."
        ],
        tips: ["A balanced approach to trade and contracts is recommended."]
      }
    ]
  },
  {
    id: "flight",
    title: "Flight",
    summary: "Basic and advanced maneuvers.",
    pages: [
      {
        heading: "Navigation",
        body: [
          "Monitor your fuel levels before attempting long jumps.",
          "Watch the range rings on the map to plan your route.",
          "Energy levels affect how often you can fire your lasers."
        ],
        tips: ["Fuel scoops can recover fuel while in flight."]
      },
      {
        heading: "Engine Management",
        body: [
          "High speeds make turning more difficult due to inertia.",
          "Tuned thrusters and stabilizers improve handling.",
          "Use roll [Q/E] to align with system planes."
        ]
      }
    ]
  },
  {
    id: "docking",
    title: "Docking",
    summary: "Safe harbor in the void.",
    pages: [
      {
        heading: "Docking Procedures",
        body: [
          "Maintain a distance of less than 80 units from a station.",
          "Engage the docking corridor with [D].",
          "The auto-docking computer handles the final approach."
        ],
        tips: ["Docking is restricted if local security is hostile."]
      }
    ]
  },
  {
    id: "stations",
    title: "Stations",
    summary: "Hubs of commerce and repair.",
    pages: [
      {
        heading: "Station Services",
        body: [
          "Availability of services depends on the station profile.",
          "Market Hubs offer advanced equipment and shipyards.",
          "Research stations often provide specialized survey gear."
        ],
        tips: ["Starter stations always provide basic refuel and repair."]
      },
      {
        heading: "Service Profiles",
        body: [
          "Shipwrights: Best selection of hulls and advanced gear.",
          "Repair Coops: Discounted maintenance and hull work.",
          "Contract Offices: Higher density of mission offers.",
          "Unstable Ports: High risk, but high reward salvage work."
        ]
      }
    ]
  },
  {
    id: "trading",
    title: "Trading",
    summary: "Buy low, sell high.",
    pages: [
      {
        heading: "Market Mechanics",
        body: [
          "BUY is what the station charges you. SELL is what the station pays you.",
          "The same station keeps a small spread, so buying and immediately selling there loses BAL.",
          "Commodity prices shift based on local economy, station type, world class, and drift.",
          "Use [Ctrl/Alt] with Digit keys for bulk buying and selling.",
          "Cargo capacity limits how much you can carry."
        ],
        tips: ["P/L compares the current SELL price with your recorded cargo basis."]
      },
      {
        heading: "Market Insight",
        body: [
          "SURPLUS marks goods that are easier to buy locally.",
          "DEMAND and SHORTAGE mark goods the station is more likely to value.",
          "Plan routes by buying surplus goods and selling into demand after fuel costs.",
          "Equipment like the Trade Ledger stores historical data."
        ],
        tips: ["Unknown cargo basis stays unknown until new purchases record a basis."]
      }
    ]
  },
  {
    id: "missions",
    title: "Missions",
    summary: "Contracts and opportunities.",
    pages: [
      {
        heading: "Contract Generation",
        body: [
          "Missions are generated deterministically at each station.",
          "Every offer is route-validated to ensure it is reachable.",
          "Accepting a mission snapshots all details and requirements."
        ],
        tips: ["If a mission requires 3 jumps and has a 5-jump deadline, you have 2 jumps of slack."]
      },
      {
        heading: "Contract Types",
        body: [
          "Courier: Transport small data wafers with no cargo cost.",
          "Haulage: Move specific quantities of goods for a fee.",
          "Urgent: Higher rewards but very strict jump deadlines.",
          "Relief: High-priority medical supplies to struggling ports."
        ]
      },
      {
        heading: "Requirements",
        body: [
          "Some missions require specialized equipment like Salvage Tongs.",
          "High-value contracts may be gated by your Reputation.",
          "Reserved cargo space reduces your normal trading capacity."
        ],
        tips: ["Deliver before the deadline or face reputation penalties."]
      }
    ]
  },
  {
    id: "map",
    title: "Map & Navigation",
    summary: "Plotting your course.",
    pages: [
      {
        heading: "The Universe Map",
        body: [
          "Use [A/D] or Arrow keys to cycle through systems.",
          "The search field filters systems by name.",
          "The teal ring indicates your maximum jump range.",
          "System classes lightly shape market stock, services, mission tendencies, and risk cues."
        ],
        tips: ["Click near a system to select it; nearby/matched targets are prioritized."]
      },
      {
        heading: "Filtering",
        body: [
          "HAZ: Filter by hazard type (calm, debris, raider trace).",
          "ECO: Filter by economy (Agricultural, Industrial, etc).",
          "DISC: Filter by discovery state (discovered/undiscovered).",
          "SVC: Filter by available services (Shipyard, Survey, etc).",
          "CLASS: Filter by system class (Cradle, Forge, etc)."
        ],
        tips: ["Use [CLR] to reset all active filters."]
      }
    ]
  },
  {
    id: "ships",
    title: "Ships & Shipyard",
    summary: "Choosing the right hull.",
    pages: [
      {
        heading: "Ship Classes",
        body: [
          "Courier: Fast and light for urgent data/package runs.",
          "Hauler: Broad-bellied with massive cargo capacity.",
          "Explorer: Long-lane specialist with huge fuel reserves.",
          "Armored: Heavy plating trading speed for survival.",
          "Balanced: Premium multi-role frames without compromise."
        ]
      },
      {
        heading: "Performance Stats",
        body: [
          "Hull/Shield: Total survival capacity.",
          "Cargo: Total units available for trade/missions.",
          "Reach: Maximum jump distance (LY) per jump.",
          "Efficiency: Fuel consumed per unit of distance."
        ]
      },
      {
        heading: "Purchasing",
        body: [
          "Ensure you have enough BAL for the new hull.",
          "Cargo must be clear if the new ship has less capacity.",
          "Installed equipment is preserved during ship transfers."
        ],
        tips: ["Use class filters to navigate the expanded catalog."]
      }
    ]
  },
  {
    id: "equipment",
    title: "Equipment",
    summary: "Hardware upgrades.",
    pages: [
      {
        heading: "Equipment Bay",
        body: [
          "The Equipment Bay handles both upgrades and hull maintenance.",
          "Upgrades are grouped into categories like Cargo, Shield, or Weapon.",
          "Advanced and Specialist gear is only found in high-tech hubs.",
          "Installed items provide passive or active bonuses to your ship."
        ],
        tips: ["Use category filters to navigate the expanded catalog."]
      },
      {
        heading: "Categories",
        body: [
          "Weapon: Pulse, Beam, and Burst laser arrays.",
          "Efficiency: Reduces energy drain and improves cooling.",
          "Navigation: Extends reach and improves route plotting.",
          "Repair: Automated drones and hull sealant foam."
        ]
      },
      {
        heading: "Maintenance",
        body: [
          "Repairs can be handled at any station with Equipment services.",
          "Drones can reduce the cost of station repairs.",
          "Some hulls support self-healing nanite gel coatings."
        ]
      }
    ]
  },
  {
    id: "combat",
    title: "Combat",
    summary: "Tactical engagements.",
    pages: [
      {
        heading: "Engagement",
        body: [
          "Monitor shield and hull integrity during combat.",
          "Lasers consume energy with every discharge.",
          "Target lead indicators help align your shots."
        ],
        tips: ["Avoid raider trace systems if your shields are low."]
      }
    ]
  },
  {
    id: "rank",
    title: "Pilot Rank",
    summary: "Measuring your progress.",
    pages: [
      {
        heading: "Progression",
        body: [
          "Rank is calculated from BAL earned, missions, and combat.",
          "Higher ranks represent your status in the sector."
        ],
        tips: RANK_THRESHOLDS.map(r => `${r.title}: ${r.score} Score`)
      }
    ]
  },
  {
    id: "reputation",
    title: "Reputation",
    summary: "Your standing in the sector.",
    pages: [
      {
        heading: "Influence",
        body: [
          "Successful missions increase your reputation.",
          "Higher reputation unlocks Trusted and specialist contracts.",
          "Failing a mission deadline results in a reputation penalty."
        ],
        tips: ["Reputation is sector-wide and persists across stations."]
      },
      {
        heading: "Recovery",
        body: [
          "Low reputation can be improved by taking low-value courier jobs.",
          "Some equipment can boost reputation gains from all work.",
          "Reputation affects the quality and pay of available offers."
        ]
      }
    ]
  },
  {
    id: "legalRisk",
    title: "Legal Risk",
    summary: "Operating outside the law.",
    pages: [
      {
        heading: "Risk Management",
        body: [
          "Some activities or restricted cargo increase your legal risk.",
          "Restricted contracts pay more but carry higher risk of fines.",
          "High risk attracts unwanted attention from local patrols."
        ],
        tips: ["Keeping a low profile reduces patrol attention over time."]
      },
      {
        heading: "Consequences",
        body: [
          "Risk increases the likelihood of hostile security encounters.",
          "Some high-tech ports may deny services to high-risk pilots.",
          "Risk can be lowered by completing legal, high-reputation work."
        ]
      }
    ]
  },
  {
    id: "saveLoad",
    title: "Save & Resume",
    summary: "Persisting your progress.",
    pages: [
      {
        heading: "Persistence",
        body: [
          "The game saves automatically after major transactions.",
          "Active mission details are snapshotted into your save file.",
          "Data is stored in your browser's local storage."
        ],
        tips: ["Clearing browser data will reset your progress."]
      }
    ]
  },
  {
    id: "demoNotes",
    title: "Demo Notes",
    summary: "Public demo boundaries.",
    pages: [
      {
        heading: "Current Status",
        body: [
          "This is a desktop-first public demo candidate.",
          "The sector contains 128 deterministic systems.",
          "Systems and content are actively being expanded."
        ]
      }
    ]
  }
];

export function getHelpSection(id: HelpSectionId): HelpSection {
  const section = HELP_CONTENT.find(s => s.id === id);
  if (!section) throw new Error(`Unknown help section: ${id}`);
  return section;
}

export function getHelpSectionForMode(mode: string): HelpSectionId {
  return SCREEN_HELP_SECTIONS[mode] ?? "quickStart";
}

export function searchHelpContent(query: string): HelpSection[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return HELP_CONTENT;

  return HELP_CONTENT.filter((section) => {
    const haystack = [
      section.title,
      section.summary,
      ...section.pages.flatMap((page) => [page.heading, ...page.body, ...(page.tips ?? [])])
    ].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });
}
