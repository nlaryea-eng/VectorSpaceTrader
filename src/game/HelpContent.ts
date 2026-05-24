import { PLAYER_SHIPS } from "./Ships";
import { EQUIPMENT } from "./Equipment";
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
        tips: ["Docking is free and refills your oxygen."]
      },
      {
        heading: "First Trade",
        body: [
          "Open the Market [T] while docked.",
          "Buy low-cost commodities like Grain or Minerals.",
          "Jump to a nearby system [M] to find a better sell price."
        ],
        tips: ["Check the price trend indicators in the market."]
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
        ]
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
        ]
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
        ]
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
          "Auto-docking will handle the final approach."
        ]
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
          "Commodity prices shift based on local economy and drift.",
          "Use [Ctrl/Alt] with Digit keys for bulk buying and selling.",
          "Cargo capacity limits how much you can carry."
        ],
        tips: ["Some missions require free cargo space."]
      }
    ]
  },
  {
    id: "missions",
    title: "Missions",
    summary: "Contracts and opportunities.",
    pages: [
      {
        heading: "Contract Types",
        body: [
          "Courier: Transport data or small items with no cargo cost.",
          "Haulage: Move specific quantities of goods for a fee.",
          "Urgent: Higher rewards but strict jump deadlines."
        ],
        tips: ["Only one active mission can be held at a time."]
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
          "Filtered search helps find specific economies or services.",
          "Discovered systems show detailed market data."
        ]
      }
    ]
  },
  {
    id: "ships",
    title: "Ships & Shipyard",
    summary: "Choosing the right hull.",
    pages: [
      {
        heading: "Ship Manifest",
        body: PLAYER_SHIPS.map(s => `${s.name}: ${s.role}. ${s.description}`)
      },
      {
        heading: "Purchasing",
        body: [
          "Ensure you have enough BAL for the new hull.",
          "Cargo must be clear if the new ship has less capacity.",
          "Equipment is preserved during ship transfers."
        ]
      }
    ]
  },
  {
    id: "equipment",
    title: "Equipment",
    summary: "Hardware upgrades.",
    pages: [
      {
        heading: "Available Gear",
        body: EQUIPMENT.map(e => `${e.name}: ${e.description}`)
      },
      {
        heading: "Maintenance",
        body: [
          "Repairs can be handled at any station with Gear services.",
          "Advanced equipment is only found in high-tech hubs."
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
          "Combat encounters are simplified in this public demo."
        ]
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
          "Current thresholds:"
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
          "Higher reputation may unlock better contracts in the future."
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
          "Some activities or cargo may increase your legal risk.",
          "High risk attracts unwanted attention from local patrols."
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
          "Data is stored in your browser's local storage.",
          "Clearing browser data will reset your progress."
        ]
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
          "Mobile layout is functional but not yet certified.",
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
